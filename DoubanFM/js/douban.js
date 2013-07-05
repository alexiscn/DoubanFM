(function () {
    window.Constants = {
        PERSONAL_CHANNEL_ID: 0,
        ILIKE_CHANNEL_ID: -3,
        OFFLINE_CHANNEL_ID: -8888,

    };
})();

//数据接口
; (function () {
    WinJS.Namespace.define('FM', {
        //获得所有频道列表
        getChannels: function () {
            WinJS.xhr({ url: 'http://www.douban.com/j/app/radio/channels' }).done(function (res) {
                if (res) {
                    var result = JSON.parse(res.responseText);
                    var isCn = FM.lang() === 'zh-CN' ? true : false;
                    if (result && result.channels) {
                        var html = '',
                            name = '',
                            length = result.channels.length,
                            current = null,
                            array = [];

                        var hearted = WinJS.Resources.getString('heartchannel').value,
                            offline = WinJS.Resources.getString('offlinechannle').value;
                        array.push('<div class="channel" data-channelName=' + hearted + ' data-channelId=-3' + '>' + hearted + '</div>');
                        //array.push('<div class="channel" data-channelName=' + offline + ' data-channelId=-8888' + '>' + offline + '</div>');
                        for (var i = 0; i < length; i++) {
                            current = result.channels[i];
                            name = isCn ? current.name : current.name_en;
                            array.push('<div class="channel" data-channelName=' + name + ' data-channelId=' + current.channel_id
                                + '>' + name + '</div>');
                        }
                        html = array.join('');

                        $('#channels').html('').append(toStaticHTML(html));
                        FM.updateCurrentChannel();
                    }
                }
            }, function (error) {
                FM.showMsg("网络异常，请检查网络");
            });
        },
        //type：可能的参数值为s、p、e、b、n、u、r。
        //s为skip，当跳过一首歌时发送。
        //p为playing，当播放列表为空时发送。
        //e为end，当一首歌完全播放完时发送。
        //b为ban，当一首歌被标记为删除，即不再播放时发送。
        //n为new，请求一个新的播放列表。
        //u和r分别是unrate和rate，用于取消红心标记和加红心标记
        //====================================
        //sid:song id，当前歌曲的id,没有为空
        //=================================
        //channel：当前用户选择的频道，0为个人电台频道，其他可以查看HTML5版（使用IE9）豆瓣电台页面的源码。
        doRequest: function (type, sid, channel, callback) {
            var url = 'http://www.douban.com/j/app/radio/people?';
            var params = [];
            params.push('type=' + type);
            params.push('sid=' + sid);
            params.push('channel=' + channel);
            if (FM.userinfo) {
                params.push('user_id=' + FM.userinfo.user_id);
                params.push('expire=' + FM.userinfo.expire);
                params.push('token=' + FM.userinfo.token);
            }
            params.push('app_name=radio_desktop_win');
            params.push('version=100');
            url += params.join('&');
            url += '&r=' + Util.md5(url + 'fr0d0').substr(-10);

            WinJS.xhr({ url: url }).done(function (res) {
                FM.setPlaylist(JSON.parse(res.responseText));
                if (callback) {
                    callback();
                }
            }, function (err) {
                FM.showMsg("网络异常，请检查网络");
            });
        }
    });

})();

//Setting帮助类
(function () {
    var localSettings = Windows.Storage.ApplicationData.current.localSettings,
    localFolder = Windows.Storage.ApplicationData.current.localFolder;
    var _settings = {
        set: function (key, value) {
            localSettings.values.insert(key, value);
        },
        get: function (key) {
            return localSettings.values[key];
        },
        remove: function (key) {
            localSettings.values.remove(key);
        }
    };
    FM.settings = _settings;

    WinJS.Namespace.define('Util', {
        md5: function (str) {
            var md5 = Windows.Security.Cryptography.Core.HashAlgorithmNames.md5,
                hashAlgorithmProvider = Windows.Security.Cryptography.Core.HashAlgorithmProvider.openAlgorithm(md5),
                str = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(str, Windows.Security.Cryptography.BinaryStringEncoding.utf8);
            str = hashAlgorithmProvider.hashData(str);
            str = Windows.Security.Cryptography.CryptographicBuffer.encodeToHexString(str);
            return str;
        },
        base64Encode: function (input) {
            var buffer = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(input, 'utf8');
            return Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
        },
        base64Decode: function (input) {
            var buffer = Windows.Security.Cryptography.CryptographicBuffer.decodeFromBase64String(input);
            return Windows.Security.Cryptography.CryptographicBuffer.convertBinaryToString('utf8', buffer);
        },
    });

    String.prototype.format = function () {
        var argumentList = arguments;
        var matchNum = this.match(/{(\d+)}/g);
        if (!matchNum) {
            return this.toString();
        }
        if (matchNum.length !== argumentList.length) {
            return String.empty;
        }
        return this.replace(/{(\d+)}/g, function (placeholder, index) {
            return argumentList[index] !== undefined ? argumentList[index] : placeholder;
        })
    };

    //可以在不同机器上同步
    var _localfolder = {
        write: function (filename, value) {
            localFolder.createFileAsync(filename, Windows.Storage.CreationCollisionOption.replaceExisting)
            .done(function (file) {
                Windows.Storage.FileIO.writeTextAsync(file, value);
            });
        },
        get: function (filename) {

            localFolder.getFileAsync(filename).done(function (file) {
                return Windows.Storage.FileIO.readTextAsync(file);
            }, function (err) {
                return null;
            });
        }
    };

    FM.localFolder = _localfolder;

    //豆瓣用户
    var _user = {
        getUser: function () {
            var user = FM.settings.get('userinfo');
            if (user) {
                return JSON.parse(user);
            }
            return null;
        },
        setUser: function (user, userinfo) {
            FM.userinfo = user;
            FM.settings.set('userinfo', userinfo);
        },
        deleteUser: function () {
            FM.settings.remove('userinfo');
        },
        //检查用户token是否过期
        checkExpire: function () {
            FM.user.dologin(Util.base64Decode(FM.settings.get('username')), Util.base64Decode(FM.settings.get('password')));
        },
        updateAccountUI: function () {
            $('#profile').show();
            document.querySelector('#profile').textContent = FM.userinfo.user_name;
        },
        dologin: function (username, pwd) {
            var url = 'http://www.douban.com/j/app/login?email=' + username + '&password=' + pwd + '&app_name=radio_desktop_win&version=100';
            WinJS.xhr({ url: url }).done(function (res) {
                FM.settings.set('username', Util.base64Encode(username));
                FM.settings.set('password', Util.base64Encode(pwd));
                var user = JSON.parse(res.responseText);
                if (user.r === 0) {
                    FM.user.setUser(user, JSON.stringify(user));
                    FM.user.updateAccountUI();
                    $('#login').trigger('closeModal');
                }

            }, function (err) {
            });
        },
        login: function () {
            $('#login progress').show();
            var username = document.querySelector('#loginuser').value,
                pwd = document.querySelector('#loginpwd').value;
            if (!username || !pwd) {
                toastr.warning('用户名或者密码不能为空!');
                return;
            }
            FM.user.dologin(username, pwd);
        }
    };
    FM.user = _user;
})();

//FM播放器类
(function () {
    var autag = null,
        playlist = [],
        index = 0,
        channel = '1',
        current = null,
        timerHandle = null,
        progressbar = null,
        progressText = null;
    FM.current = function () {
        return current;
    };
    FM.getCurrentChannelId = function () {
        return channel;
    };
    FM.currentChannel = "华语";

    FM.attachEvent = function () {
        FM.registerMediaControl();
        var channellist = $('#channels');
        channellist.delegate('div', 'click', function (e) {
            FM.swithchannel(e.target.getAttribute('data-channelId'), e.target.getAttribute('data-channelName'), e.target);
        });
        $('.channelInfo').click(function () {
            if (channellist.is(":visible")) {
                channellist.hide();
            }
            else {
                channellist.show();
            }
        });


        /**
         * 注册事件
         */
        document.querySelector('#iconPlayPause').addEventListener('click', FM.playpause, false);
        document.querySelector('#coveroverlay').addEventListener('click', FM.playpause, false);
        document.querySelector('#iconHeart').addEventListener('click', FM.heart, false);
        document.querySelector('#iconDelete').addEventListener('click', FM.remove, false);
        document.querySelector('#iconNext').addEventListener('click', FM.next, false);
        document.querySelector('#btnlogin').addEventListener('click', FM.user.login, false);
        document.querySelector('#volumerange').addEventListener('change', FM.volumechange, false);

        $('#guide').easyModal({ overlay: 0.4, overlayClose: true });
        $('#logo').click(function () {
            $('#guide').trigger('openModal');
        });

        $('#login').easyModal({ overlay: 0.4, overlayClose: true });
        $('#loginpwd').on('keydown', function (e) {
            if (e.keyCode === 13) {
                FM.user.login();
            }
        });

        $('#iconVolume').click(function () {
            var head = document.querySelector('#iconVolume'),
                menu = document.querySelector('#volumeControl').winControl;
            menu.anchor = head;
            menu.placement = "top";
            menu.alignment = "left";
            menu.show();
        });
    };

    FM.start = function () {
        autag = document.querySelector('#audioPlayer');
        autag.onended = function () {
            FM.doRequest('e', current.sid, channel);
            FM.next();
        };
        progressbar = document.querySelector('#progressBar');
        progressText = document.querySelector('#progressText');
        FM.lyric = FM.Lrc();
        timerHandle = window.setInterval(FM.timer, 1000);
    };

    //Suspended To Resuming
    FM.resume = function (session) {
        FM.start();
        channel = session.channel || '1';
        FM.currentChannel = session.currentChannel || '华语';
        $('#currentChannel').text(FM.currentChannel + ' MHz');
        FM.userinfo = session.userinfo;
        playlist = session.playlist || [];
        FM.doRequest('n', '', channel)
    };
    //Running To Suspended
    FM.suspended = function (session) {
        session.channel = channel;
        session.currentChannel = FM.currentChannel;
        session.userinfo = FM.userinfo;
        session.playlist = playlist;
    };

    //FM初始化
    FM.init = function () {
        $('#channels').css('width', '100%').css('width', '-=600px');
        FM.start();
        var volume = 0.5;
        var svolume = FM.settings.get('volume');
        if (svolume) {
            volume = svolume / 100;
            document.querySelector('#volumerange').value = svolume;
        }
        autag.volume = volume;

        //豆瓣当前账号
        FM.userinfo = FM.user.getUser();
        if (FM.userinfo) {
            FM.user.updateAccountUI();
        }

        FM.getChannels();
        channel = FM.settings.get('last-channel');
        var channelname = FM.settings.get('last-channel-name');
        if (!channel) {
            if (FM.lang() == 'zh-CN') {
                channel = '1';
                channelname = '华语';
            }
            else {
                channel = '2';
                channelname = 'Euro-American';
            }
        }
        FM.currentChannel = channelname;
        $('#currentChannel').text(channelname + ' MHz');
        FM.doRequest('n', '', channel);

    };

    FM.showMsg = function (msg) {
        var dialog = new Windows.UI.Popups.MessageDialog(msg);
        dialog.showAsync();
    };

    FM.lang = function () {
        var langs = Windows.Globalization.ApplicationLanguages.languages;
        if (langs.length >= 1 && langs[0] === 'zh-Hans-CN') {
            return 'zh-CN';
        }
        else {
            return 'en-US';
        }
    }
    //FM播放
    FM.play = function () {
        current = playlist[index];
        if (!current) {
            FM.doRequest('n', playlist[index - 1].sid, channel);
            return;
        }
        //过滤豆瓣推的广告音频
        if (current.length < 90) {
            FM.next();
            return;
        }
        autag.src = current.url;
        autag.play();
        FM.updateUI();
    };
    //播放、暂停按钮事件处理
    FM.playpause = function () {
        var viewState = Windows.UI.ViewManagement.ApplicationViewState,
        state = Windows.UI.ViewManagement.ApplicationView.value;
        var isSnapp = state == viewState.snapped ? true : false;

        //如果当前autag为null,初始化
        if (!autag) {
            FM.init();
            return;
        }

        if (autag.paused) {
            var pos = isSnapp ? '-96px -80px' : '-80px 0px';
            $('.icon-playpause').css('background-position', pos);
            $('#coveroverlay').hide();
            autag.play();
        }
        else {
            var pos = isSnapp ? '-192px -80px' : '0px 0px';
            $('.icon-playpause').css('background-position', pos);
            $('#coveroverlay').show();
            autag.pause();
        }
    };

    //切换频道事件处理
    FM.swithchannel = function (channelId, channelname, target) {
        if (channelId === channel) {
            return;
        }

        if (channelId == Constants.ILIKE_CHANNEL_ID ||
            channelId == Constants.OFFLINE_CHANNEL_ID) {
            if (!checkUser()) {
                return;
            }
        }

        FM.lyric.reset();
        autag.pause();
        channel = channelId;
        $('.channel').removeClass('channelcurrent');
        $(target).addClass('channelcurrent');
        FM.settings.set('last-channel', channel);
        FM.settings.set('last-channel-name', channelname);
        $('#currentChannel').text(channelname + ' MHz');
        FM.currentChannel = channelname;
        FM.updateCurrentChannel();
        playlist = [];
        index = 0;
        FM.doRequest('n', '', channel);
    };
    //Next按钮事件处理
    FM.next = function () {
        //如果当前autag为null,初始化
        if (!autag) {
            FM.init();
            return;
        }

        FM.lyric.reset();
        if (index >= playlist.length - 2) {
            index = playlist.length - 1;
            FM.doRequest('n', current.sid, channel);
            return;
        }
        FM.doRequest('n', current.sid, channel);
        index++;
        FM.play();
    };
    //检查用户是否已登录
    function checkUser() {
        if (!FM.userinfo) {
            $('#login').trigger('openModal');
            return false;
        }
        return true;
    };
    //FM标记红心
    FM.heart = function (islove) {
        //如果当前autag为null,初始化
        if (!autag) {
            FM.init();
            return;
        }

        if (checkUser()) {
            FM.doRequest(islove ? 'r' : 'u', current.sid, channel, function () {
                current.like = 1;
                FM.updateHeartUI();
                toastr.info(WinJS.Resources.getString('markhearted').value);
            });
        }
    };
    //FM标记删除
    FM.remove = function () {
        //如果当前autag为null,初始化
        if (!autag) {
            FM.init();
            return;
        }

        if (checkUser()) {
            FM.doRequest('b', current.sid, channel, function () {
                toastr.info(WinJS.Resources.getString('deleted').value);
            });
            FM.next();
        }
    };
    //FM设置当前播放列表
    FM.setPlaylist = function (list) {
        if (list && list.song) {
            var length = list.song.length
            for (var i = 0; i < length; i++) {
                playlist.push(list.song[i]);
            }
        }
        if (index < playlist.length && autag.paused) {
            FM.play();
        }
    };
    FM.volumechange = function (e) {
        var volume = e.target.value;
        FM.settings.set('volume', volume)
        autag.volume = volume / 100;
    };
    //FM更新歌曲信息
    FM.updateUI = function () {
        var img = current.picture.replace('mpic', 'lpic');
        document.querySelector('#title').textContent = current.title;
        document.querySelector('#artistName').textContent = current.artist;
        $('#coverimage').css('background-image', 'url(' + img + ')');
        FM.updateHeartUI();
        FM.lyric.load(current.artist, current.title);
    };
    FM.updateHeartUI = function () {
        if (current.like) {
            $('.icon-heart').addClass('iconActive');
        }
        else {
            $('.icon-heart').removeClass('iconActive');
        }
    };
    FM.updateCurrentChannel = function () {
        $('.channel').removeClass('channelcurrent');
        $('[data-channelId=' + channel + ']').addClass('channelcurrent');
    };

    //处理歌词与进度的Timer
    FM.timer = function () {
        if (autag && !autag.paused && current) {
            var time = autag.currentTime;
            progressbar.value = time / current.length;
            progressText.textContent = '-' + formatTime(current.length - time);
            FM.lyric.update(Math.round(time * 1000));
        }
    };

    FM.registerMediaControl = function () {
        var mediaControls = null;
        mediaControls = Windows.Media.MediaControl;
        mediaControls.addEventListener('playpausetogglepressed', playpausetoggle, false);
        mediaControls.addEventListener('playpressed', playbutton, false);
        mediaControls.addEventListener('pausepressed', pausebutton, false);
        mediaControls.addEventListener('stoppressed', stopbutton, false);
        function playpausetoggle() {
            if (autag.paused) {
                autag.play();
            }
            else {
                autag.pause();
            }
        };
        function playbutton() {
            Windows.Media.MediaControl.isPlaying = true;
            autag.play();
        };
        function pausebutton() {
            Windows.Media.MediaControl.isPlaying = false;
            autag.pause();
        };
        function stopbutton() {
            autag.stop();
            Windows.Media.MediaControl.isPlaying = false;
        };
    };

    function formatTime(time) {
        return pad(Math.floor(time / 60), 2) + ":" + pad(Math.floor(time % 60), 2);
    };

    //对目标数字进行0补齐处理
    //@param source[number]
    //@param length[number]
    function pad(source, length) {
        var pre = "",
        negative = (source < 0),
        string = String(Math.abs(source));

        if (string.length < length) {
            pre = (new Array(length - string.length + 1)).join('0');
        }

        return (negative ? "-" : "") + pre + string;
    };

})();

//程序Setting Charm
(function () {
    Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView().addEventListener('commandsrequested', function (e) {
        e.request.applicationCommands.append(JumpUri('privacy', WinJS.Resources.getString('policy').value, 'http://shuifeng.sinaapp.com/xiami/douban.html#policy'));
        e.request.applicationCommands.append(JumpUri('feedback', WinJS.Resources.getString('feedback').value, 'mailto:wpxiami@sina.com?subject=豆酱FM意见反馈'));

        e.request.applicationCommands.append(new Windows.UI.ApplicationSettings.SettingsCommand('recapps', WinJS.Resources.getString('moreapps').value, function (e) {
            var uri = new Windows.Foundation.Uri('ms-windows-store:Search?query=徐水峰');
            Windows.System.Launcher.launchUriAsync(uri);
        }));
    });

    function JumpUri(id, lable, url) {
        var cmd = new Windows.UI.ApplicationSettings.SettingsCommand(id, lable, function (cmd) {
            if (id === 'privacy' && FM.lang() != 'zh-CN') {
                url = 'http://shuifeng.sinaapp.com/xiami/douban.en.html';
            }
            var uri = new Windows.Foundation.Uri(url);
            Windows.System.Launcher.launchUriAsync(uri).then(function () {
            });
        });
        return cmd;
    };
})();

(function () {
    FM.Lrc = function () {
        var TOKEN_REGEXP = /\[(.*?)\](.*?)(?=(\[|$))/igm,
            //已经按时间排序后的歌词列表
            lrcList = [],
            //HTML数组
            lrcElmList = [],
            position = 0,
            currentLyricPos = 0,
            container = $('#lyric_panel'),
            containerWarpper = $('#lyricWarpper'),
            lineHeight = 25,
            isparsed = false;
        var tt = ttplayer();
        //加载歌词
        var load = function (artist, title) {
            var filename = encodeURI(artist + title) + ".lrc";
            var content = FM.localFolder.get(filename);
            if (content) {
                parse(content);
                return;
            }
            WinJS.xhr({ url: 'http://geci.me/api/lyric/' + title + '/' + artist }).done(function (res) {
                if (res) {
                    var lrc = JSON.parse(res.responseText);
                    if (lrc.count >= 1) {
                        var url = lrc.result[0].lrc;
                        WinJS.xhr({ url: url }).done(function (result) {
                            FM.localFolder.write(filename, result.responseText);
                            parse(result.responseText);
                        });
                    }
                    else {

                        tt.get(artist, title);
                    }
                }
            }, function (error) {
            });
        };

        var reset = function () {
            container.html('');
        };

        //解析lrc文件
        var parse = function (value) {
            token = {},
            tokenElm = [],
            offset = 0,
            tmpTime = 0,
            i = 0,
            rawText = value.replace(/\n/gmi, ' ');
            lrcList = [];
            TOKEN_REGEXP.lastIndex = 0;
            while (token = TOKEN_REGEXP.exec(rawText)) {
                tokenElm = token[1].split(":");
                switch (tokenElm[0]) {
                    case "al": //Album where the song is from
                    case "ar": //Lyrics artist
                    case "by": //Creator of the LRC file
                    case "re": //The player or editor that creates LRC file
                    case "ti": //Lyrics (song) title
                    case "ve": //version of program
                        break;
                    case "offset":
                        break;
                    default:
                }
                //not time token
                if (!(/^\d+$/i.test(tokenElm[0]))) {
                    continue;
                };

                tmpTime = (parseInt(token[1].substr(0, 2)) * 60 + parseFloat(token[1].substring(3))) * 1000 - offset;

                if (token[2] == " ") {
                    token[2] = "   ";
                };

                lrcList.push({ time: tmpTime, content: token[2] });

                i = lrcList.length - 1;
                while (i--) {
                    if (lrcList[i].content == "") {
                        lrcList[i].content = token[2];
                    }

                    if (lrcList[i].time > tmpTime && lrcList[i].content == " ") {
                        lrcList[i].content = token[2];
                    }
                }
            }

            lrcList = lrcList.sort(lrcElmSortFunc);
            ////填充HTML
            container.html('');
            lrcElmList = [];
            var el;
            for (var i = 0; i < lrcList.length; i++) {
                el = $('<li />').attr("id", 'li-' + i).html(toStaticHTML(lrcList[i].content));
                container.append(el);
                el.attr('data-top', $('#li-' + i).position().top - 600);
                lrcElmList.push(el);
            }

            isparsed = true;
        };

        //根据当前播放时间更新当前歌词
        var updatePosition = function (value) {
            if (lrcList.length === 0 || Math.abs(value - position) < 1000 || !isparsed) {
                return;
            }
            position = value;

            var index = getCurrentIndex(position), offset = 3;
            if (index === currentLyricPos) {
                return;
            }
            currentLyricPos = index;

            //highlight
            for (var i = lrcElmList.length - 1; i > 0; i--) {
                if (currentLyricPos === i) {
                    lrcElmList[i].addClass('current');
                } else {
                    lrcElmList[i].removeClass('current');
                }
            }

            //scroll
            index = index - offset;
            if (index < 0) {
                containerWarpper.animate({
                    scrollTop: top,
                    scrollLeft: 0
                }, 100);
                return;
            }

            var top = $('#li-' + index).attr('data-top');
            containerWarpper.animate({
                scrollTop: top,
                scrollLeft: 0
            }, 400);
        };

        var lrcElmSortFunc = function (a, b) {
            if (a.time == b.time) {
                return 0;
            };
            return a.time > b.time ? 1 : -1;
        }

        //根据时间获得当前歌词
        var getCurrentIndex = function (time) {
            var i = lrcList.length;
            while (i-- && lrcList[i].time > time) { }
            return Math.min(Math.max(i, 0), lrcList.length - 1);
        };

        return {
            load: load,
            update: updatePosition,
            reset: reset,
            parse: parse
        };
    };

    //千千静听歌词类
    var ttplayer = function () {
        this.requestLrc = function (artist, title) {
            var url = 'http://ttlrcct.qianqian.com/dll/lyricsvr.dll?sh?Artist=' + _encode(artist) + '&Title=' + _encode(title) + '&Flags=0';
            WinJS.xhr({ url: url }).done(function (res) {
                var doc = new Windows.Data.Xml.Dom.XmlDocument();
                doc.loadXml(res.responseText);
                var node = doc.selectSingleNode("/result/lrc");
                if (node) {
                    var id = node.getAttribute("id"),
                        ar = node.getAttribute("artist"),
                        ti = node.getAttribute("title");
                    url = 'http://ttlrcct2.qianqian.com/dll/lyricsvr.dll?dl?Id=' + id + '&Code=' + _verifyCode(ar, ti, id);
                    WinJS.xhr({ url: url }).done(function (res) {
                        FM.lyric.parse(res.responseText);
                    });
                }
            });
        };

        function _encode(str) {
            str = (str || "").replace(/[ ']/g, "").toLowerCase();
            return escape(str).replace(/%u(..)(..)|%(..)|(.)/g, function ($, $1, $2, $3, $4) {
                if ($1) return $2 + $1;
                if ($3) return $3 + "00";
                return ("0" + $4.charCodeAt(0).toString(16)).slice(-2) + "00";
            });
        };

        function _conv(i) {
            var r = i % 4294967296;
            if (i >= 0 && r > 2147483648)
                r = r - 4294967296;
            if (i < 0 && r < 2147483648)
                r = r + 4294967296;
            return r;
        };

        function _mConv(ia, ib) {
            var o = (ia > 0 && ib > 0) ? 1 : (ia < 0 && ib < 0) ? 1 : -1;
            var a = ia.toString(2).replace(/\D/g, '').split("").reverse();
            var b = ib.toString(2).replace(/\D/g, '').split("").reverse();
            var c = []; c.length = 34; c = c.join("0").split("");
            for (var i = 0; i < b.length; i++) {
                if (b[i] == '1') {
                    for (var j = 0; j < a.length && j + i < 33; j++)
                        c[j + i] = c[j + i] - (-a[j]);
                }
            }
            for (var i = 0; i < 32; i++) {
                c[i + 1] += parseInt(c[i] / 2);
                c[i] = c[i] % 2;
            }
            c = parseInt(c.slice(0, 32).reverse().join(""), 2) * o;
            if (o == 1 && c > 2147483648)
                c = c - 4294967296;
            if (o == -1 && c < 2147483648)
                c = c + 4294967296;
            return c;
        };

        function _verifyCode(artist, title, lrcId) {
            var song = [];
            encodeURIComponent(artist + title).replace(/%(..)|(.)/g, function ($, $1, $2) {
                if ($1)
                    song.push(parseInt($1, 16));
                else
                    song.push($2.charCodeAt(0));
            });
            var intVal2 = 0, intVal3 = 0;
            var intVal1 = (lrcId & 0xFF00) >> 8;
            if ((lrcId & 0xFF0000) == 0) {
                intVal3 = 0xFF & ~intVal1;
            } else {
                intVal3 = 0xFF & ((lrcId & 0xFF0000) >> 16);
            }
            intVal3 = intVal3 | ((0xFF & lrcId) << 8);
            intVal3 = intVal3 << 8;
            intVal3 = intVal3 | (0xFF & intVal1);
            intVal3 = intVal3 << 8;
            if ((lrcId & 0xFF000000) == 0) {
                intVal3 = intVal3 | (0xFF & (~lrcId));
            } else {
                intVal3 = intVal3 | (0xFF & (lrcId >> 24));
            }
            var uBound = song.length - 1;
            while (uBound >= 0) {
                var c = song[uBound];
                if (c >= 0x80)
                    c = c - 0x100;
                intVal1 = (c + intVal2) & 0xFFFFFFFF;
                intVal2 = (intVal2 << (uBound % 2 + 4)) & 0xFFFFFFFF;
                intVal2 = (intVal1 + intVal2) & 0xFFFFFFFF;
                uBound -= 1;
            }
            uBound = 0;
            intVal1 = 0;
            while (uBound <= song.length - 1) {
                var c = song[uBound];
                if (c >= 128)
                    c = c - 256;
                var intVal4 = (c + intVal1) & 0xFFFFFFFF;
                intVal1 = (intVal1 << (uBound % 2 + 3)) & 0xFFFFFFFF;
                intVal1 = (intVal1 + intVal4) & 0xFFFFFFFF;
                uBound += 1;
            }
            var intVal5 = _conv(intVal2 ^ intVal3) & 0xFFFFFFFF;
            intVal5 = _conv(intVal5 + (intVal1 | lrcId)) & 0xFFFFFFFF;
            intVal5 = _mConv(intVal5, intVal1 | intVal3);
            intVal5 = _mConv(intVal5, intVal2 ^ lrcId);
            var longVal6 = intVal5;
            if (intVal5 > 2147483648)
                intVal5 = (intVal5 - 4294967296) & 0xFFFFFFFF;
            return intVal5.toString();
        }

        return {
            get: requestLrc
        }
    };

})();