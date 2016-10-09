$(document).ready(function() {
    init();

    function init() {
        var ls = new LS();
        var data = ls.get();

        console.log(data);

        var timeBetween = data && data.timeBetween ? data.timeBetween : 30;
        var delay       = data && data.delay       ? data.delay       : 30;
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

        var alarmControl = new AlarmControl(timeBetween, function(time) {
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
                curr.add(self.timeBetween(), 'minutes');
            }
            return times;
        }

        function calcStart() {
            var now = moment();
            now.seconds(60);
            var minutes = now.minutes();
            var newMinutes = (Math.ceil((now.minutes() + 1) / self.timeBetween()) + 1) * self.timeBetween();
            newMinutes += newMinutes - minutes < self.delay() ? self.timeBetween() : 0;
            now.minutes(newMinutes);
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
