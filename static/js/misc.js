['bet1-amount-minus', 'bet1-amount-plus', 'bet2-amount-minus', 'bet2-amount-plus'].forEach(element => {
    $('#' + element).click(function () {
        const bet = element.split('-')[0];
        const sign = element.split('-')[2];

        var value = parseInt($(`#${bet}-amount`).val().substring(1));
        if (sign == 'minus') {
            value -= 1;
        } else {
            value += 1;
        }
        if (value < 0) {
            value = 0;
        } else if (value > 1000) {
            value = 1000;
        }
        $(`#${bet}-amount`).val(`$${value}`);
    });
});

[1, 2].forEach(bet => {
    $(`#bet${bet}-amount`).on('input', function () {
        // check the format of the input. It should be like $35. If not, check if the input is an integer, and if so, add a $ to the front. If not, do not change the value of the input.
        const value = $(this).val();
        if (value == '') {
            $(this).val('$');
            return;
        }
        if (value[0] != '$') {
            const parsed = parseInt(value);
            if (isNaN(parsed)) {
                return;
            }
            $(this).val('$' + parsed);
        }
        const val = parseInt(value.substring(1));
        if (isNaN(val)) {
            return;
        }
        if (val < 0) {
            $(this).val('$0');
            return;
        }
        if (val > 1000) {
            $(this).val('$1000');
            return;
        }
    });
});
