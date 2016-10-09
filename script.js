$(document).ready(function() {
    init();

    function init() {
        var ls = new LS();
        var data = ls.get();

        console.log(data);

        var interval  = data && data.interval  ? data.interval  : 30;
        var delay     = data && data.delay     ? data.delay     : 30;
        var timesList = data && data.timesList ? data.timesList : null;
        var lastUsed  = data && data.lastUsed  ? data.lastUsed  : null;

        var viewModel = new RemindVM(interval, delay, timesList, lastUsed, new AlarmControl(interval), ls);
        ko.applyBindings(viewModel, $('#remind-me')[0]);
    }

    function RemindVM(interval, delay, timesList, lastUsed, alarmControl, ls) {
        var self = this;

        self.interval = ko.observable(interval);
        self.delay = ko.observable(delay);
        self.timesStart = ko.observable(moment("8:00am", "h:mma"));
        self.timesEnd = ko.observable(moment("10:01pm", "h:mma"));

        // if used more than 12 hours ago, reset timesList
        if (!lastUsed || (lastUsed && moment().diff(lastUsed, 'hours') >= 11)) {
            timesList = createTimes();
        }

        var times = {
            start: self.timesStart,
            end: self.timesEnd,
            list: ko.observable(timesList)
        }

        self.times = ko.observable(times);
        saveToLocalStorage();

        self.timesStart.subscribe(updateTimes);
        self.timesEnd.subscribe(updateTimes);
        self.alarmText = ko.observable();

        self.clock = ko.observable(moment().format('h:mma'));
        self.alarm = ko.observable(false);

        function Time(time, checked) {
            this.time = time;
            this.checked = checked;
        }

        setInterval(function() {
            self.clock(moment().format('h:mma'));
        }, 1000);

        self.changeAlarm = function(data) {
            var timesList = self.times().list();
            ls.updateKey('timesList', timesList);

            if (data.checked) {
                alarmControl.createAlarm(data.time, function() {
                    console.log('starting alarm callback');

                    self.alarmText(moment(data.time, 'h:mma').format('h:mm a'));
                    self.alarm(true);
                });
            } else {
                alarmControl.deleteAlarm(data.time);
            }
        }

        self.stopAlarm = function() {
            console.log('stopping alarm');
            alarmControl.stopAlarm();
            self.alarmText('');
            self.alarm(false);
            updateTimes();
        }

        function updateTimes() {

        }

        function createTimes() {
            var curr = moment();
            // curr = moment().hours(1); // TODO: take this out
            var start = self.timesStart();
            var end = self.timesEnd();
            if (curr.isBefore(start)) {
                curr = start;
            } else {
                curr = calcStart();
            }

            console.log(curr._d);

            var times = [];

            while (!curr.isAfter(end)) {
                times.push(new Time(curr.format("h:mma"), false));
                curr.add(self.interval(), 'minutes');
            }
            return times;
        }

        function calcStart() {
            var now = moment();
            now.seconds(60);
            var minutes = now.minutes();
            var newMinutes = (Math.ceil((now.minutes() + 1) / self.interval()) + 1) * self.interval();
            newMinutes += newMinutes - minutes < self.delay() ? self.interval() : 0;
            now.minutes(newMinutes);
            return now;
        }

        function saveToLocalStorage() {
            console.log(self.times().list());
            ls.set({
                interval  : self.interval(),
                delay     : self.delay(),
                timesList : self.times().list(),
                lastUsed  : moment()
            })
        }
    }


    function AlarmControl(interval) {
        var self = this;

        function AlarmList(unsortedList) {
            var self = this;
            var list = [];
            if (unsortedList) {
                list = unsortedList.sort(function(a,b) {
                    return a.ringTime < b.ringTime ? -1 : 1;
                }).slice(); // make a copy of the list
            }



            this.insert = function(alarm) {
                var index = binaryIndexOf(0, list.length - 1, alarm.ringTime, getRingTime);
                return list.splice(index, 0, alarm);
            }

            this.remove = function(alarmTime) {
                console.log(list);
                var index = binaryIndexOf(0, list.length - 1, alarmTime, getAlarmTime);
                console.log(index);
                return removeIndexAndDuplicates(index, alarmTime, getAlarmTime);
            }

            // TODO: take this out
            this.ringTimeIndex = function(ringTime) {
                return binaryIndexOf(0, list.length - 1, ringTime, getRingTime);
            }

            // TODO: take this out
            this.log = function() {
                console.log(list);
            }

            this.pop = function() {
                return list.pop();
            }

            this.length = function() {
                return list.length;
            }

            function getAlarmTime(alarm) {return alarm.alarmTime};
            function getRingTime(alarm) {return alarm.ringTime};

            function binaryIndexOf(start, end, value, accessProperty) {
                console.log('binaryIndexOf');
                if (start > end) return start;
                var index = (start + end) / 2 | 0;
                console.log(start, end, index);
                console.log(accessProperty(list[index]), value);
                if (accessProperty(list[index]) < value) {
                    return binaryIndexOf(index + 1, end, value, accessProperty);
                } else if (accessProperty(list[index]) > value) {
                    return binaryIndexOf(start, index - 1, value, accessProperty);
                } else {
                    return index;
                }
            }

            // function binaryIndexOf(start, end, value) {
            //     console.log('binaryIndexOf');
            //     if (start > end) return start;
            //     var index = (start + end) / 2 | 0;
            //     console.log(start, end, index);
            //     console.log(list[index].ringTime, value);
            //     if (list[index].ringTime < value) {
            //         return binaryIndexOf(index + 1, end, value);
            //     } else if (accessProperty(list[index]) > value) {
            //         return binaryIndexOf(start, index - 1, value);
            //     } else {
            //         return index;
            //     }
            // }

            function removeIndexAndDuplicates(start, value, accessProperty) {
                var numToDelete = 1;
                var index = start + 1;
                while (index < list.length) {
                    console.log(index, numToDelete);

                    if (accessProperty(list[index]) == value) {
                        numToDelete++;
                    } else {
                        break;
                    }
                    index++;
                }
                return list.splice(start, numToDelete);
            }
        }

        var list = new AlarmList(); // TODO: take this out
        list.insert({alarmTime: 1, ringTime: 1})
        list.insert({alarmTime: 4, ringTime: 4})
        list.ringTimeIndex(4);

        self.alarms = new AlarmList();
        var alarmInterval = interval;
        var alarmSound;
        var audioContext = new AudioContext();

        self.createAlarm = function(alarmTime, cb) {
            var ringTime = moment(data.time, 'h:mma').subtract(self.delay(), 'minutes');
            // ringTime = moment(); //TODO: take this out

            self.alarms.insert({alarmTime: alarmTime, ringTime: ringTime});

            var hour = parseInt(ringTime.format('H'));
            var minute = parseInt(ringTime.format('mm'));

            function alarmTimer() {
                var now = moment();
                var currentHour = parseInt(now.format('H'));
                var currentMinute = parseInt(now.format('mm'));
                console.log(currentHour, currentMinute);
                if ((hour === currentHour) && (minute === currentMinute)) {
                    startAlarm(alarmTime);
                    cb();
                }
            }
            self.timers[alarmTime] = setInterval(alarmTimer, 1000);
            console.log(self.timers);
        }

        self.deleteAlarm = function(time) {
            self.alarms.remove(time);
        }

        self.setAlarmInterval = function(interval) {
            alarmInterval = interval;
            // TODO: update timers
        }

        self.stopAlarm = function() {
            clearInterval(alarmInterval);
        }

        function startAlarm(time) {
            console.log(time);
            console.log(self.timers);
            clearInterval(self.timers[time]);
            delete self.timers[time];
            alarmInterval = setInterval(playAlarmNote, 500);
            var timeElement = $('#times input:checkbox').filter(function() {
                return this.value === time;
            });
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
        //     timesList : array of Time
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
            if (data) data[key] = value;
            this.set(data);
        }
    }


});
