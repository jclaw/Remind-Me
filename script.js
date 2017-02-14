$(document).ready(function() {
    init();

    function init() {
        var ls = new LS();
        var data = ls.get();

        console.log(data);

        // var timeBetween = data && data.timeBetween ? data.timeBetween : 30;
        var timeBetween = 2;
        var delay = 15;
        // var delay       = data && data.delay       ? data.delay       : 30;
        var timesList   = data && data.timesList   ? data.timesList   : null;
        var lastUsed    = data && data.lastUsed    ? data.lastUsed    : null;

        var viewModel = new RemindVM(timeBetween, delay, timesList, lastUsed, ls);
        ko.applyBindings(viewModel, $('#remind-me')[0]);
    }

    function RemindVM(timeBetween, delay, timesList, lastUsed, ls) {
        var self = this;

        self.timeBetween = ko.observable(timeBetween);
        self.delay = ko.observable(delay);
        self.timesStart = ko.observable(moment("8:00am", "h:mma"));
        self.timesEnd = ko.observable(moment("10:01pm", "h:mma"));

        // if used more than 12 hours ago, reset timesList
        if (!lastUsed || (lastUsed && moment().diff(lastUsed, 'hours') >= 11)) {
            timesList = createTimes();
        }

        // TODO: take this out
        timesList = createTimes();

        var times = {
            start: self.timesStart,
            end: self.timesEnd,
            list: ko.observableArray(timesList)
        }

        self.times = ko.observable(times);

        saveToLocalStorage();

        self.alarmText = ko.observable();

        self.clock = ko.observable(moment().format('h:mma'));
        self.alarm = ko.observable(false);

        var alarmControl = new AlarmControl(delay, function(time) {
            console.log('starting alarm callback');

            self.alarmText(moment(time, 'h:mma').format('h:mm a'));
            self.alarm(true);
            console.log(self.times().list());
            self.times().list.shift();
            ls.updateKey('timesList', timesList);


            alarmControl.removeCurrentAlarm();
        });

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
                alarmControl.createAlarm(data.time);
            } else {
                alarmControl.deleteAlarm(data.time);
            }
        }

        self.stopAlarm = function() {
            console.log('stopping alarm');
            alarmControl.stopAlarm();
            self.alarmText('');
            self.alarm(false);
        }

        // TODO: take this out
        self.createTimes = createTimes;

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
            console.log('time between:', self.timeBetween());

            while (!curr.isAfter(end)) {
                times.push(new Time(curr.format("h:mma"), false));
                curr.add(self.timeBetween(), 'minutes');
            }
            return times;
        }

        function calcStart() {
            var now = moment();
            console.log('calcstart');
            now.seconds(60); // rounds seconds up to nearest minute
            var minutes = now.minutes();
            console.log(minutes);

            // the first alarm has to be offset from the current time by
            // at least the amount of the delay
            var soonestTime = minutes + self.delay();
            console.log('soonest time: ', soonestTime);
            var distanceToNextInterval;
            if (soonestTime % self.timeBetween() == 0) {
                distanceToNextInterval = 0;
            } else {
                distanceToNextInterval = self.timeBetween() - (soonestTime % self.timeBetween());
            }
            console.log('distance to next interval: ', distanceToNextInterval);
            var nextInterval = soonestTime + distanceToNextInterval;

            now.minutes(nextInterval);
            return now;
        }

        function saveToLocalStorage() {
            console.log(self.times().list());
            ls.set({
                timeBetween  : self.timeBetween(),
                delay        : self.delay(),
                timesList    : self.times().list(),
                lastUsed     : moment()
            })
        }
    }

});
