$(document).ready(function() {
    init();

    function init() {
        var ls = new LS();
        var data = ls.get();

        console.log(data);

        var timeBetween = data && data.timeBetween ? parseInt(data.timeBetween) : 30;
        var delay       = data && data.delay       ? parseInt(data.delay)       : 15;
        var activeAlarms = data && data.activeAlarms ? data.activeAlarms : [];
        var lastUsed    = data && data.lastUsed    ? data.lastUsed    : null;

        // if used more than 12 hours ago, reset activeAlarms
        if (!lastUsed || (lastUsed && moment().diff(lastUsed, 'hours') >= 11)) {
            activeAlarms = [];
        }

        var viewModel = new RemindVM(timeBetween, delay, activeAlarms, lastUsed, ls);
        ko.applyBindings(viewModel, $('#remind-me')[0]);
    }

    function RemindVM(timeBetween, delay, activeAlarms, lastUsed, ls) {
        var self = this;

        var alarmControl = new AlarmControl(delay, activeAlarms, ls, function(time) {

            self.alarmText(moment(time, 'h:mma').format('h:mm a'));
            self.alarm(true);
            self.times().list.shift();

            alarmControl.removeCurrentAlarm();
        });

        self.timeBetween = ko.observable(timeBetween);
        self.delay = ko.observable(delay);
        self.timesStart = ko.observable(moment("8:00am", "h:mma"));
        self.timesEnd = ko.observable(moment("10:01pm", "h:mma"));

        self.alarmText = ko.observable();

        self.clock = ko.observable(moment().format('h:mma'));
        self.alarm = ko.observable(false);

        self.times = ko.observable({
            start: self.timesStart,
            end: self.timesEnd,
            list: ko.observableArray(createTimes())
        });

        self.delay.subscribe(function(newDelay) {
            alarmControl.setAlarmDelay(newDelay);
            ls.updateKey('delay', newDelay);
        })

        console.log(self.times().list());

        saveToLocalStorage();

        function Time(time, checked) {
            this.time = time;
            this.checked = checked;
        }

        setInterval(function() {
            self.clock(moment().format('h:mma'));
        }, 1000);

        self.changeAlarm = function(data, e) {
            if (data.checked) {
                alarmControl.createAlarm(data.time);
            } else {
                alarmControl.deleteAlarm(data.time);
            }
        }

        self.stopAlarm = function() {
            alarmControl.stopAlarm();
            self.alarmText('');
            self.alarm(false);
        }

        function createTimes() {
            var now = moment();
            var curr;
            // curr = moment().hours(1); // TODO: take this out
            var start = self.timesStart();
            var end = self.timesEnd();
            console.log(now.format('h:mma'));
            console.log(start.format('h:mma'));
            if (now.isBefore(start)) {
                console.log('at start');
                curr = start;
            } else {
                console.log('calculating start');
                curr = calcStart();
            }

            var times = [];

            console.log(curr.format('h:mma'));
            console.log(end.format('h:mma'));

            while (!curr.isAfter(end)) {
                var activeAlarms = alarmControl.activeAlarms();
                var result = activeAlarms.find(function(alarm) {
                    return curr.format("h:mma") === alarm.alarmTime;
                })
                var checked = !!result;

                times.push(new Time(curr.format("h:mma"), checked));
                curr.add(self.timeBetween(), 'minutes');
            }
            return times;
        }

        function calcStart() {
            var now = moment();
            now.seconds(60); // rounds seconds up to nearest minute
            var minutes = now.minutes();

            // the first alarm has to be offset from the current time by
            // at least the amount of the delay
            console.log(minutes);
            console.log('delay:', self.delay());
            var soonestTime = minutes + self.delay();
            console.log(soonestTime);
            var distanceToNextInterval;
            if (soonestTime % self.timeBetween() == 0) {
                distanceToNextInterval = 0;
            } else {
                distanceToNextInterval = self.timeBetween() - (soonestTime % self.timeBetween());
            }
            console.log(distanceToNextInterval);
            var nextInterval = soonestTime + distanceToNextInterval;
            console.log(nextInterval);

            now.minutes(nextInterval);
            return now;
        }

        function saveToLocalStorage() {
            ls.set({
                timeBetween  : self.timeBetween(),
                delay        : self.delay(),
                activeAlarms : alarmControl.activeAlarms(),
                lastUsed     : moment()
            })
        }
    }

});
