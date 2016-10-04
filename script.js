$(document).ready(function() {
    var interval = 30;
    var delay = 30;
    var timesList = createTimes();
    var timers = {};

    updateTimes(times);

    function createTimes() {
        var curr = moment();
        var start = moment("8:00am", "hh:mm a");
        var end = moment("10:00pm", "hh:mm a");
        var timesList = [];
        if (curr.isBefore(start)) {
            curr = start;
        } else {
            curr = calcStart();
        }

        console.log(curr._d);

        while (curr.isSameOrBefore(end)) {
            timesList.push({
                time: curr.format("hh:mm a"),
                checked: false
            });
            curr.add(interval, 'minutes');
        }

        return timesList;
    }

    function calcStart() {
        var now = moment();
        now.seconds(60);
        var minutes = now.minutes();
        var newMinutes = (Math.ceil((now.minutes() + 1) / interval) + 1) * interval;
        newMinutes += newMinutes - minutes < delay ? interval : 0;
        now.minutes(newMinutes);
        return now;
    }

    function updateTimes() {
        var times = []
        var start = calcStart();
        $.each(timesList, function(index, obj) {
            if (moment(obj.time, 'hh:mm a').isAfter(start)) {
                times.push(obj);
            }
        })
        timesList = times;
        $('#times').html('');
        $.each(times, function(index, obj) {
            var time = obj.time;
            var element = $('<label>');
            var input = $('<input>');
            var controlIndicator = $('<div>');
            element.addClass('control control--checkbox');
            element.text(time);
            input.attr('type', 'checkbox');
            input.attr('value', time);
            input.prop('checked', obj.checked);

            input.change(checkboxCallback);

            controlIndicator.addClass('control__indicator');
            element.append(input, controlIndicator);
            $('#times').append(element);
        })
    }

    function checkboxCallback() {
        var time = $(this).attr('value');
        if ($(this).is(':checked')) {
            var ringTime = moment(time, 'hh:mm a').subtract(delay, 'minutes');
            var hour = ringTime.format('H');
            var minute = ringTime.format('mm');
            hour = 1;
            minute = 57;
            console.log(hour, minute);
            function alarmTimer() {
                var now = moment();
                var currentHour = parseInt(now.format('H'));
                var currentMinute = parseInt(now.format('mm'));
                console.log(currentHour, currentMinute);
                if ((hour === currentHour) && (minute === currentMinute)) {
                    $('#alarm').data('time', time);
                    $('#alarm').show();
                }
            }
            timers[time] = setInterval(alarmTimer, 1000);
            timers[time];
        } else {
            clearInterval(timers[time]);
            delete timers[time];
        }
    }

    $('#alarm button').click(function() {
        var time = moment($('#alarm').data('time'), "hh:mm a");
        var timeFormatted = time.format("hh:mm a");

        updateTimes();
        clearInterval(timers[timeFormatted]);
        delete timers[timeFormatted];

        $('#alarm').hide();
    })
})
