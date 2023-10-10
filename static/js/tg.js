const TgApp = {
    initData: Telegram.WebApp.initData || '',
    initDataUnsafe: Telegram.WebApp.initDataUnsafe || {},
    MainButton: Telegram.WebApp.MainButton,

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
        const webViewStatus = document.querySelector('#webview_data_status');
        if (TgApp.initDataUnsafe.query_id &&
            TgApp.initData &&
            webViewStatus.classList.contains('status_need')
        ) {
            webViewStatus.classList.remove('status_need');
            TgApp.apiRequest('checkInitData', {}, function(result) {
                if (result.ok) {
                    webViewStatus.textContent = 'Hash is correct (async)';
                    webViewStatus.className = 'ok';
                } else {
                    webViewStatus.textContent = result.error + ' (async)';
                    webViewStatus.className = 'err';
                }
            });
        }
    },

    // Alerts
    showAlert(message) {
        Telegram.WebApp.showAlert(message);
    },
    showConfirm(message) {
        Telegram.WebApp.showConfirm(message);
    },

    // Other
    apiRequest(method, data, onCallback) {
        const authData = TgApp.initData || '';
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
            onCallback && onCallback({error: 'Server error'});
        });
    }
}

// check init data
TgApp.checkInitData();
TgApp.init();
TgApp.expand();


window.DemoApp = TgApp;