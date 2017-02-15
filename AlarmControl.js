function AlarmControl(delay, prevActiveAlarms, LS, alarmCallback) {
    var self = this;

    function AlarmList(unsortedList) {
        var self = this;
        var list = [];
        if (unsortedList) {
            list = unsortedList.sort(function(a,b) {
                return a.ringTime > b.ringTime ? -1 : 1;
            }).slice(); // make a copy of the list
        }

        this.insert = function(alarm) {
            var index = binaryIndexOfReverse(0, list.length - 1, alarm.ringTime, getRingTime, function(index) {
                return index;
            });
            list.splice(index, 0, alarm);
        }

        this.remove = function(alarmTime) {
            var index = binaryIndexOfReverse(0, list.length - 1, alarmTime, getAlarmTime, function() {
                return -1;
            });
            return index == -1 ? index : removeIndexAndDuplicates(index, alarmTime, getAlarmTime);
        }

        // TODO: take this out
        this.ringTimeIndex = function(ringTime) {
            return binaryIndexOfReverse(0, list.length - 1, ringTime, getRingTime, function(index) {
                return index;
            });
        }

        // TODO: take this out
        this.list = function() {
            return list;
        }


        this.pop = function() {
            return list.pop();
        }

        this.last = function() {
            return list[list.length - 1];
        }

        this.length = function() {
            return list.length;
        }

        function getAlarmTime(alarm) {return alarm.alarmTime};
        function getRingTime(alarm) {return alarm.ringTime};

        function binaryIndexOfReverse(start, end, value, accessProperty, notFound) {
            if (start > end) return notFound(start);
            var index = (start + end) / 2 | 0;
            if (accessProperty(list[index]) > value) {
                return binaryIndexOfReverse(index + 1, end, value, accessProperty, notFound);
            } else if (accessProperty(list[index]) < value) {
                return binaryIndexOfReverse(start, index - 1, value, accessProperty, notFound);
            } else {
                return index;
            }
        }

        function removeIndexAndDuplicates(start, value, accessProperty) {
            while (start > 0 && accessProperty(list[start - 1]) == value) {
                start--;
            }

            var index = start + 1;
            while (index < list.length && accessProperty(list[index]) == value) {
                index++;
            }

            return list.splice(start, index - start);
        }
    }

    self.createAlarm = function(alarmTime) {
        console.log('create alarm');
        var ringTime = moment(alarmTime, 'h:mma').subtract(delay, 'minutes');
        console.log(alarmTime, ': ringing at', ringTime.format('h:mma'));
        self.alarms.insert({alarmTime: alarmTime, ringTime: ringTime});
        LS.updateKey('activeAlarms', self.activeAlarms());
    }

    self.deleteAlarm = function(alarmTime) {
        var deletedAlarm = self.alarms.remove(alarmTime);
        LS.updateKey('activeAlarms', self.activeAlarms());
        return deletedAlarm;
    }

    self.removeCurrentAlarm = function() {
        return self.alarms.pop();
    }

    self.activeAlarms = function() {
        return self.alarms.list();
    }

    self.setAlarmDelay = function(d) {
        delay = d;
        // TODO: update timers
    }

    init();




    function init() {
        self.alarms = new AlarmList();
        var alarmSound;
        var timerInterval;
        var alarmNoteInterval;
        var audioContext = new AudioContext();

        startTimer();
        addPrevActiveAlarms();
    }

    function addPrevActiveAlarms() {
        var now = moment();
        var alarm;
        var ringTime;
        console.log(prevActiveAlarms);
        for (var i = 0; i < prevActiveAlarms.length; i++) {
            alarm = prevActiveAlarms[i];
            ringTime = moment(alarm.ringTime);
            if (ringTime.isAfter(now)) {
                self.createAlarm(prevActiveAlarms[i].alarmTime);
            }
        }
    }

    function startTimer() {
        function alarmTimer() {
            if (self.alarms.length() > 0) {
                var now = moment();
                var alarm = self.alarms.last();
                // alarm = {alarmTime: alarm.alarmTime, ringTime: moment()}; // TODO: take this out
                var hour = parseInt(alarm.ringTime.format('H'));
                var minute = parseInt(alarm.ringTime.format('mm'));
                var currentHour = parseInt(now.format('H'));
                var currentMinute = parseInt(now.format('mm'));
                if ((hour === currentHour) && (minute === currentMinute)) {
                    startAlarm();
                    alarmCallback(alarm.alarmTime);
                }
            }
        }

        timerInterval = setInterval(alarmTimer, 1000);
    }

    self.stopAlarm = function() {
        alarmSound.pause();
        alarmSound.currentTime = 0;
        startTimer();
    }

    function startAlarm() {

        alarmSound = new Audio('Glass.mp3');
        alarmSound.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
        }, false);
        alarmSound.play();

    }

    function playAlarmNote() {
        alarmSound = audioContext.createOscillator();
        var volume = audioContext.createGain();

        volume.gain.value = 0.1;
        alarmSound.connect(volume);
        volume.connect(audioContext.destination);

        // How long to play oscillator for (in seconds)
        var duration = .1;

        // When to start playing the oscillators
        var startTime = audioContext.currentTime;

        var frequency = 493.883;
        alarmSound.frequency.value = frequency;

        volume.gain.setValueAtTime(0.1, startTime + duration - 0.01);
        volume.gain.linearRampToValueAtTime(0, startTime + duration);

        alarmSound.start(startTime);
        alarmSound.stop(startTime + duration);
    }
}

function LS() {
    // data = {
    //     interval  : number
    //     delay     : number
    //     activeAlarms : array of active alarms
    //     lastUsed  : moment object
    // }
    var lsKey = 'remindMe';
    this.get = function() {
        return JSON.parse(localStorage.getItem(lsKey));
    }
    this.set = function(data) {
        localStorage.setItem(lsKey, JSON.stringify(data));
    }
    this.updateKey = function(key, value) {
        var data = this.get();
        if (data && key in data) data[key] = value;
        else console.error('key not found in local storage');
        this.set(data);
    }
}
