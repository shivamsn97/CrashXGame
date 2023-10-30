const TgApp = {
    initData: Telegram.WebApp.initData || '',
    initDataUnsafe: Telegram.WebApp.initDataUnsafe || {},
    MainButton: Telegram.WebApp.MainButton,
    Verified: false,

    init(options) {
        document.body.style.visibility = '';
        Telegram.WebApp.ready();
    },
    expand() {
        Telegram.WebApp.expand();
    },
    close() {
        Telegram.WebApp.close();
    },
    // toggleMainButton(el) {
    //     const mainButton = Telegram.WebApp.MainButton;
    //     if (mainButton.isVisible) {
    //         mainButton.hide();
    //         el.innerHTML = 'Show Main Button';
    //     } else {
    //         mainButton.show();
    //         el.innerHTML = 'Hide Main Button';
    //     }
    // },

    // actions
    checkInitData() {
        if (!TgApp.initDataUnsafe.query_id ||
            !TgApp.initData)
        {
            this.Verified = false;
            // $('#not_verified').removeClass('hidden');
            // $('#main_section').addClass('hidden');
            // console.log('not verified');
            // return;
        }
        if (this.Verified === false) 
        {
            TgApp.apiRequest('checkInitData', {}, function(result) {
                console.log(result);
                if (result.ok) {
                    TgApp.Verified = true;
                } else {
                    TgApp.Verified = false;
                    // $('#not_verified').removeClass('hidden');
                    // $('#main_section').addClass('hidden');
                    console.log('not verified');
                }
            });
        }
    },

    // Alerts
    showAlert(message) {
        Telegram.WebApp.showAlert(message);
    },

    closeWithAlert(message) {
        Telegram.WebApp.showAlert(message);
        Telegram.WebApp.close();
    },

    showConfirm(message) {
        Telegram.WebApp.showConfirm(message);
    },

    haptic(intensity = 'soft') {
        Telegram.WebApp.HapticFeedback.impactOccurred(intensity);
    },

    // Other
    apiRequest(method, data, onCallback) {
        const authData = TgApp.initDataUnsafe || '';
        fetch('/api/tg_validate', {
            method: 'POST',
            body: JSON.stringify(Object.assign(data, {
                _auth: authData,
                method: method,
            })),
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(function(response) {
            return response.json();
        }).then(function(result) {
            onCallback && onCallback(result);
        }).catch(function(error) {
            onCallback && onCallback({'ok': false, 'error': error});
        });
    }
}

// check init data
TgApp.checkInitData();
TgApp.init();
TgApp.expand();


window.TgApp = TgApp;