$(document).ready(function() {
    init();

    function init() {
        var ls = new LS();
        var data = ls.get();

        console.log(data);

        // var timeBetween = data && data.timeBetween ? data.timeBetween : 30;
        var timeBetween = 1;
        var delay = 15;
        // var delay       = data && data.delay       ? data.delay       : 30;
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
        // self.timesEnd = ko.observable(moment("10:01pm", "h:mma"));
        self.timesEnd = ko.observable(moment("11:31pm", "h:mma"));

        self.alarmText = ko.observable();

        self.clock = ko.observable(moment().format('h:mma'));
        self.alarm = ko.observable(false);

        self.times = ko.observable({
            start: self.timesStart,
            end: self.timesEnd,
            list: ko.observableArray(createTimes())
        });

        saveToLocalStorage();

        function Time(time, checked) {
            this.time = time;
            this.checked = checked;
        }

        setInterval(function() {
            self.clock(moment().format('h:mma'));
        }, 1000);

        self.changeAlarm = function(data, e) {
            console.log('changed alarm');
            console.log(e);
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
            var curr = moment();
            // curr = moment().hours(1); // TODO: take this out
            var start = self.timesStart();
            var end = self.timesEnd();
            if (curr.isBefore(start)) {
                curr = start;
            } else {
                curr = calcStart();
            }

            var times = [];

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
            var soonestTime = minutes + self.delay();
            var distanceToNextInterval;
            if (soonestTime % self.timeBetween() == 0) {
                distanceToNextInterval = 0;
            } else {
                distanceToNextInterval = self.timeBetween() - (soonestTime % self.timeBetween());
            }
            var nextInterval = soonestTime + distanceToNextInterval;

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
