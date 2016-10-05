$(document).ready(function() {
    init();

    function init() {
        var delay = localStorage.getItem('delay') || 30;
        var times = {
            start: ko.observable(moment("8:00am", "hh:mm a")),
            end: ko.observable(moment("10:01pm", "hh:mm a")),
            list: ko.observable(localStorage.getItem('timesList'))
        }
        var alarmInterval = 30;
        var viewModel = new RemindVM(delay, times, new AlarmControl(alarmInterval));
        ko.applyBindings(viewModel, $('#remind-me')[0]);
    }

    function AlarmControl(interval) {
        var self = this;
        self.timers = {};
        var alarmInterval = interval;
        var alarmSound;
        var audioContext = new AudioContext();
        self.startTimer = function(ringTime, alarmTime, cb) {
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

        self.stopTimer = function(time) {
            console.log('stopping');
            clearInterval(self.timers[time]);
            delete self.timers[time];
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

    function RemindVM(delay, times, alarmControl) {
        var self = this;
        self.clock = ko.observable(moment().format('h:mm a'));
        self.alarm = ko.observable(false);

        self.interval = ko.observable(30);
        self.delay = ko.observable(delay);
        self.times = ko.observable(times);
        self.times.initialize = createTimes;
        self.times().start.subscribe(updateTimes);
        self.times().end.subscribe(updateTimes);
        self.alarmText = ko.observable();

        var Time = function(time, checked) {
            this.time = time;
            this.checked = checked;
        }

        setInterval(function() {
            self.clock(moment().format('h:mm a'));
        }, 1000);

        self.times.initialize();

        self.changeTimer = function(data) {
            if (data.checked) {
                var ringTime = moment(data.time, 'hh:mm a').subtract(self.delay(), 'minutes');
                // ringTime = moment(); //TODO: take this out

                alarmControl.startTimer(ringTime, data.time, function() {
                    console.log('starting alarm callback');

                    self.alarmText(moment(data.time, 'hh:mm a').format('h:mm a'));
                    self.alarm(true);
                });
            } else {
                alarmControl.stopTimer(data.time);
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
            var start = self.times().start();
            var end = self.times().end();
            if (curr.isBefore(start)) {
                curr = start;
            } else {
                curr = calcStart();
            }

            var times = [];

            while (!curr.isAfter(end)) {
                times.push(new Time(curr.format("hh:mm a"), false));
                curr.add(self.interval(), 'minutes');
            }

            self.times().list(times);
            console.log(self.times().list());
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

    }


});
