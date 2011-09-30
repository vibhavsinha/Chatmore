$(function () {
    //
    // Private members.
    //
    var ircElement = $('.ircweb2');
    var server = 'irc.dsm.org';
    var port = 6667;
    var nick = 'lamer' + Math.floor(Math.random() * 10000);
    var realname = 'Lamer user';
    var irc = new chatmore(ircElement.get(0), server, port, nick, realname);

    var quitMessage = 'Chatmore IRC client';
    var defaultTitle = document.title;
    var notificationTitle = 'A new message has arrived! -- ' + defaultTitle
    var isWindowFocused = true;
    var prevState;
    var msgSenders = [];
    var autoCompleteReplyIndex; // Autocomplete index against msgSenders array when replying to message senders.
    var autoCompletePrefix;     // Autocomplete filter, word typed at first Tab completion.
    var autoCompleteSuggest;    // Suggestion given from last Tab completion
    var reactivateAttempts = 0;
    var maxReactivateAttempts = 6;
    var reactivateDelay = 10; // in seconds.

    // IRC client message templates.
    var tmpls = {
        timestamp: '<span class="timestamp">[${getTimestamp()}]&nbsp;</span>',
        notePrefix: '<span class="prefix">***</span>',
        error: '{{tmpl "timestamp"}}<span class="error">' +
            '{{tmpl "notePrefix"}} <span class="message">${message}</span>' +
            '</span>',
        usage: '{{tmpl "timestamp"}}<span class="usage">' +
            '{{tmpl "notePrefix"}} <span class="message">${message}</span>' +
            '</span>',
        help: '{{tmpl "timestamp"}}<span class="help">' +
            '{{tmpl "notePrefix"}} <span class="message">${message}</span>' +
            '</span>',
        serverMsg: '{{tmpl "timestamp"}}<span class="serverMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">${message}</span>' +
            '</span>',
        clientMsg: '{{tmpl "timestamp"}}<span class="clientMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">${message}</span>' +
            '</span>',
        outgoingChannelMsg: '{{tmpl "timestamp"}}<span class="channelMsg">' +
            '<span class="prefix">&lt;<span class="channel">${channel}</span>:<span class="nick">${clientNick}</span>&gt;</span> ' +
            '<span class="message">${message}</span>' +
            '</span>',
        outgoingPrivateMsg: '{{tmpl "timestamp"}}<span class="PRIVMSG">' +
            '<span class="prefix">-&gt; *<span class="nick">${nick}</span>*</span> ' +
            '<span class="message">${message}</span>' +
            '</span>',
        outgoingChannelAction: '{{tmpl "timestamp"}}<span class="channelMsg">' +
            '<span class="prefix">&lt;<span class="channel">${channel}</span>&gt; *</span> ' +
            '<span class="message"><span class="nick">${clientNick}</span> ${message}</span>' +
            '</span>',
        outgoingPrivateAction: '{{tmpl "timestamp"}}<span class="PRIVMSG">' +
            '<span class="prefix">-&gt; *<span class="nick">${nick}</span>*</span> ' +
            '<span class="message"><span class="nick">${clientNick}</span> ${message}</span>' +
            '</span>',
        outgoingChannelNotice: '{{tmpl "timestamp"}}<span class="PRIVMSG">' +
            '<span class="prefix">-<span class="channel">${channel}</span>-</span> ' +
            '<span class="message">${message}</span>' +
            '</span>',
        outgoingPrivateNotice: '{{tmpl "timestamp"}}<span class="PRIVMSG">' +
            '<span class="prefix">-<span class="nick">${nick}</span>-</span> ' +
            '<span class="message">${message}</span>' +
            '</span>',
        incomingChannelMsg: '{{tmpl "timestamp"}}<span class="channelMsg">' +
            '<span class="prefix">&lt;<span class="channel">${channel}</span>:<span class="nick">${nick}</span>&gt;</span> ' +
            '<span class="message">${message}</span>' +
            '</span>',
        incomingPrivateMsg: '{{tmpl "timestamp"}}<span class="PRIVMSG">' +
            '<span class="prefix">*<span class="nick">${nick}</span>*</span> ' +
            '<span class="message">${message}</span>' +
            '</span>',
        incomingChannelAction: '{{tmpl "timestamp"}}<span class="channelMsg">' +
            '<span class="prefix">&lt;<span class="channel">${channel}</span>&gt; *</span> ' +
            '<span class="message"><span class="nick">${nick}</span> ${message}</span>' +
            '</span>',
        incomingPrivateAction: '{{tmpl "timestamp"}}<span class="PRIVMSG">' +
            '<span class="prefix">*</span>' +
            '<span class="message"><span class="nick">${nick}</span></span> ${message}</span>' +
            '</span>',
        incomingPrivateNotice: '{{tmpl "timestamp"}}<span class="PRIVMSG">' +
            '<span class="prefix">-<span class="nick">${nick}</span>-</span> ' +
            '<span class="message">${message}</span>' +
            '</span>',
        incomingChannelNotice: '{{tmpl "timestamp"}}<span class="PRIVMSG">' +
            '<span class="prefix">-<span class="channel">${channel}</span>:<span class="nick">${nick}</span>-</span> ' +
            '<span class="message">${message}</span>' +
            '</span>',
        queryOff: '{{tmpl "timestamp"}}<span class="queryMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">' +
            '{{if /^[#&!]/.test(prevTarget)}}' +
                'You are no longer talking on channel <span class="channel">${prevTarget}</span>' +
            '{{else}}' +
                'Ending conversation with <span class="nick">${prevTarget}</span>' +
            '{{/if}}' +
            '</span>',
        query: '{{tmpl "timestamp"}}<span class="queryMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">' +
            '{{if /^[#&!]/.test(target)}}' +
                'You are now talking on channel <span class="channel">${target}</span>' +
            '{{else}}' +
                'Starting conversation with <span class="nick">${target}</span>' +
            '{{/if}}' +
            '</span>',
        queryOffChannel: '{{tmpl "timestamp"}}<span class="queryMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">You are no longer talking to channel <span class="channel">${channel}</span></span>' +
            '</span>',
        queryOffNick: '{{tmpl "timestamp"}}<span class="queryMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">Ending conversation with <span class="nick">${nick}</span></span>' +
            '</span>',
        queryChannel: '{{tmpl "timestamp"}}<span class="queryMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">You are now talking to channel <span class="channel">${channel}</span></span>' +
            '</span>',
        queryNick: '{{tmpl "timestamp"}}<span class="queryMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">Starting conversation with <span class="nick">${nick}</span></span>' +
            '</span>',
        join: '{{tmpl "timestamp"}}<span class="JOIN">' +
            '<span class="prefix">*** &lt;<span class="channel">${channel}</span>&gt;</span> ' +
            '<span class="message"><span class="nick">${nick}</span> <span class="message">(${ident}@${host}) has joined the channel</span>' +
            '</span>',
        leave: '{{tmpl "timestamp"}}<span class="PART">' +
            '<span class="prefix">*** &lt;<span class="channel">${channel}</span>&gt;</span> ' +
            '<span class="message"><span class="nick">${nick}</span> has left channel{{if comment !== undefined}}: ${comment}{{/if}}</span>' +
            '</span>',
        kick: '{{tmpl "timestamp"}}<span class="KICK">' +
            '<span class="prefix">*** &lt;<span class="channel">${channel}</span>&gt;</span> ' +
            '<span class="message"><span class="nick">${op}</span> has kicked <span class="nick">${nick}</span> from the channel{{if comment !== undefined}}: ${comment}{{/if}}</span>' +
            '</span>',
        nick: '{{tmpl "timestamp"}}{{tmpl "notePrefix"}} <span class="NICK"><span class="message">' +
            '{{if clientNick.toLowerCase() == prevNick.toLowerCase()}}' +
                'Nick changed to <span class="nick">${nick}</span>' +
            '{{else}}' +
                '<span class="nick">${prevNick}</span> is now known as <span class="nick">${nick}</span>' +
            '{{/if}}' +
            '</span></span>',
        nickInUse: '{{tmpl "timestamp"}}<span class="serverMsg">' +
            '{{tmpl "notePrefix"}} <span class="message">Nickname <span class="nick">${nick}</span> is already in use.</span>' +
            '</span>',
        notopic: '{{tmpl "timestamp"}}<span class="TOPIC">' +
            '{{tmpl "notePrefix"}} &lt;<span class="channel">${channel}</span>&gt; <span class="message">No topic is set</span>' +
            '</span>',
        topic: '{{tmpl "timestamp"}}<span class="TOPIC">' +
            '<span class="prefix">*** &lt;<span class="channel">${channel}</span>&gt;</span> ' +
            '<span class="message">The current topic is: <span class="topicMessage">${topic}</span></span>' +
            '</span>',
        changeTopic: '{{tmpl "timestamp"}}<span class="TOPIC"><span class="prefix">*** &lt;<span class="channel">${channel}</span>&gt;</span> <span class="message"><span class="nick">${nick}</span> ' +
            '{{if topic == ""}}' +
                'has cleared the topic' +
            '{{else}}' +
                'has changed the topic to: <span class="topicMessage">${topic}</span>' +
            '{{/if}}' +
            '</span></span>',
        topicSetBy: '{{tmpl "timestamp"}}<span class="TOPIC">' +
            '<span class="prefix">*** &lt;<span class="channel">${channel}</span>&gt;</span> ' +
            '<span class="message">Topic set by <span class="nick">${nick}</span> on <span class="time">${formatTime(time)}</span></span>' +
            '</span>',
        serverTime: '{{tmpl "timestamp"}}<span class="TIME">' +
            '{{tmpl "notePrefix"}} <span class="message">Server time for <span class="server">${server}</span>: <span class="time">${timeString}</span></span>' +
            '</span>',
        quit: '{{tmpl "timestamp"}}<span class="QUIT">' +
            '{{tmpl "notePrefix"}} <span class="message">Signoff: <span class="nick">${nick}</span> (${message})</span>' +
            '</span>',
        error: '{{tmpl "timestamp"}}<span class="ERROR">' +
            '{{tmpl "notePrefix"}} <span class="message">${message}</span>' +
            '</span>',
        userMode: '{{tmpl "timestamp"}}<span class="MODE">' +
            '{{tmpl "notePrefix"}} <span class="message">Mode change "<span class="userMode">${mode}</span>" for user <span class="nick">${target}</span> by <span class="nick">${nick}</span></span>' +
            '</span>'
    };
    
    // Client /command definitions.
    var cmdDefs = {
        help: {
            helpUsage: 'Usage: /help &lt;command&gt;',
            helpText: [
                'Show help for client commands.',
                'Commands:',
                ' clear - Clear the chat console',
                ' cleartopic - Clear the channel\'s topic',
                ' join - Join a channel',
                ' kick - Kick user from channel',
                ' leave - Leave a channel',
                ' me - Send an action message',
                ' motd - Get the server message of the day',
                ' msg - Send a private message',
                ' nick - Change your nick',
                ' notice - Send a notice to a nick or channel',
                ' query - Select a target for messaging',
                ' quit - Quit IRC session',
                ' time - Get the server time',
                ' topic - Get or set the channel\'s topic',
                ' who - Get info on a nick'
            ],
            parseParam: function (param, meta) {
                if (param === undefined) param = 'help';
                
                if (cmdDefs[param] === undefined) {
                    meta.error = 'Error: Cannot get help on unknown command "' + param + '".';
                    return false;
                }

                meta.cmd = param;
            },
            exec: function (meta) {
                var cmdDef = cmdDefs[meta.cmd];
                writeTmpl('help', { message: cmdDef.helpUsage });
                
                if (typeof(cmdDef.helpText) === 'object')
                    $.each(cmdDef.helpText, function (i, text) {
                        writeTmpl('help', { message: text });
                    });
                else
                    writeTmpl('help', { message: cmdDef.helpText });
            }
        },
        raw: {
            helpUsage: 'Usage: /raw &gt;IRC request message&lt;',
            helpText: 'Send a raw IRC request based on RFC2812.',
            parseParam: function (param, meta) {
                meta.param = param;
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to send a raw IRC request.';
                    return false;
                }
            },
            exec: function (meta) {
                irc.sendMsg(meta.param);
            }
        },
        time: {
            helpUsage: 'Usage: /time [server]',
            helpText: [
                'Get the server time.',
                'If server parameter is omitted, query current server.'
            ],
            parseParam: function (param, meta) {
                meta.server = param;
            
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to get server time.';
                    return false;
                }
            },
            exec: function (meta) {
                if (meta.server !== undefined && meta.server.length > 0)
                    irc.sendMsg('TIME ' + meta.server);
                else
                    irc.sendMsg('TIME');
            }
        },
        motd: {
            helpUsage: 'Usage: /motd [server]',
            helpText: [
                'Get the server message of the day.',
                'If server parameter is omitted, query current server.'
            ],
            parseParam: function (param, meta) {
                meta.server = param;
            
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to get server motd.';
                    return false;
                }
            },
            exec: function (meta) {
                if (meta.server !== undefined && meta.server.length > 0)
                    irc.sendMsg('MOTD ' + meta.server);
                else
                    irc.sendMsg('MOTD');
            }
        },
        clear: {
            helpUsage: 'Usage: /clear',
            helpText: 'Clear the chat console.',
            parseParam: function () { },
            exec: function (meta) {
                ircElement.find('.ircChannel').html('');
            }
        },
        query: {
            helpUsage: 'Usage: /query &lt;nick|#channel&gt;',
            helpText: 'Select a nick or channel to send messages.',
            parseParam: function (param, meta) {
                if (param === undefined) {
                    meta.error = cmdDefs['query'].helpUsage;
                    return false;
                }
                
                var params = param.split(/\s+/, 1);
                meta.target = params[0];
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to query a target.';
                    return false;
                }
            },
            exec: function (meta) {
                queryTarget(meta.target);
            }
        },
        me: {
            helpUsage: 'Usage: /me &lt;message&gt;',
            helpText: 'Send an action message to currently selected channel or nick.',
            parseParam: function (param, meta) {
                var usage = cmdDefs['msg'].helpUsage;
                
                if (param === undefined) {
                    meta.error = usage;
                    return false;
                }
                
                meta.target = irc.target();
                meta.message = param;
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to send an action message.';
                    return false;
                }
            },
            exec: function (meta) {
                if (isChannel(meta.target)) {
                    irc.sendChannelAction(meta.target, meta.message);
                    writeTmpl('outgoingChannelAction', {
                        clientNick: irc.state().nick,
                        channel: meta.target,
                        message: meta.message
                    });
                }
                else {
                    irc.sendPrivateAction(meta.target, meta.message);
                    writeTmpl('outgoingPrivateAction', {
                        clientNick: irc.state().nick,
                        nick: meta.target,
                        message: meta.message
                    });
                }
            }
        },
        msg: {
            helpUsage: 'Usage: /msg &lt;nick|#channel&gt; &lt;message&gt;',
            helpText: 'Send a private message to a nick.',
            parseParam: function (param, meta) {
                var usage = cmdDefs['msg'].helpUsage;
                
                if (param === undefined) {
                    meta.error = usage;
                    return false;
                }
                
                var m = /^(\S+)\s+(.+)$/.exec(param);
                if (m === null || m.length != 3) {
                    meta.error = usage;
                    return false;
                }
                meta.target = m[1];
                meta.message = m[2];
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to send a message.';
                    return false;
                }
            },
            exec: function (meta) {
                if (isChannel(meta.target)) {
                    irc.sendChannelMsg(meta.target, meta.message);
                    writeTmpl('outgoingChannelMsg', {
                        clientNick: irc.state().nick,
                        channel: meta.target,
                        message: meta.message
                    });
                }
                else {
                    irc.sendPrivateMsg(meta.target, meta.message);
                    writeTmpl('outgoingPrivateMsg', {
                        clientNick: irc.state().nick,
                        nick: meta.target,
                        message: meta.message
                    });
                }
            }
        },
        notice: {
            helpUsage: 'Usage: /notice &lt;nick|#channel&gt; &lt;message&gt;',
            helpText: 'Send a notice to a nick or channel.',
            parseParam: function (param, meta) {
                var usage = cmdDefs['msg'].helpUsage;
                
                if (param === undefined) {
                    meta.error = usage;
                    return false;
                }
                
                var m = /^(\S+)\s+(.+)$/.exec(param);
                if (m === null || m.length != 3) {
                    meta.error = usage;
                    return false;
                }
                meta.target = m[1];
                meta.message = m[2];
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to send a notice.';
                    return false;
                }
            },
            exec: function (meta) {
                if (isChannel(meta.target)) {
                    irc.sendChannelNotice(meta.target, meta.message);
                    writeTmpl('outgoingChannelNotice', {
                        clientNick: irc.state().nick,
                        channel: meta.target,
                        message: meta.message
                    });
                }
                else {
                    irc.sendPrivateNotice(meta.target, meta.message);
                    writeTmpl('outgoingPrivateNotice', {
                        clientNick: irc.state().nick,
                        nick: meta.target,
                        message: meta.message
                    });
                }
            }
        },
        topic: {
            helpUsage: 'Usage: /topic [message]',
            helpText: 'Get or set the selected channel\'s topic',
            parseParam: function (param, meta) {
                if (irc.target() === undefined) {
                    meta.error = 'Error: No target selected.  Use: /query &lt;nick|#channel&gt;.';
                    return false;
                }
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to get or set the topic.';
                    return false;
                }
                
                meta.topic = param;
            },
            exec: function (meta) {
                if (meta.topic === undefined) {
                    irc.sendMsg('TOPIC ' + irc.target());
                }
                else {
                    irc.sendMsg('TOPIC ' + irc.target() + ' :' + meta.topic);
                }
            }
        },
        cleartopic: {
            helpUsage: 'Usage: /cleartopic',
            helpText: 'Clear the selected channel\'s topic',
            parseParam: function (param, meta) {
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to clear the topic.';
                    return false;
                }
            },
            exec: function (meta) {
                irc.sendMsg('TOPIC ' + irc.target() + ' :');
            }
        },
        who: {
            helpUsage: 'Usage: /who',
            helpText: 'Get info on a nick.',
            exec: function () {
                irc.sendMsg('WHO');
            }
        },
        join: {
            helpUsage: 'Usage: /join &lt;#channel&gt; [key]',
            helpText: 'Join a channel.  Include a key if the channel requires it to join.',
            parseParam: function (param, meta) {
                if (param === undefined) {
                    meta.error = cmdDefs['join'].helpUsage;
                    return false;
                }
                
                var params = param.split(/\s+/, 2);
                // Normalize channel name if it's missing a prefix.
                meta.channel = params[0].replace(/^([^#&!])/, '#$1');
                if (params[1] !== undefined) meta.key = params[1];
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to join a channel.';
                    return false;
                }
            },
            exec: function (meta) {
                if (irc.state().channels[meta.channel] !== undefined) {
                    // If already joined to this channel, just query it.
                    queryTarget(meta.channel);
                }
                else {
                    if (meta.key !== undefined)
                        irc.sendMsg('JOIN ' + meta.channel + ' ' + meta.key);
                    else
                        irc.sendMsg('JOIN ' + meta.channel);
                }
            }
        },
        kick: {
            helpUsage: 'Usage: /kick &gt;nick&lt; [comment]',
            helpText: 'Kick user from channel',
            parseParam: function (param, meta) {
                var usage = cmdDefs['kick'].helpUsage;
                var m = /^(\S+)(\s+(.+))?/.exec(param);
                if (m === null) {
                    meta.error = usage;
                    return false;
                }
                
                meta.channel = irc.target();
                meta.nick = m[1];
                meta.comment = m[3];
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to kick a user.';
                    return false;
                }
            },
            exec: function (meta) {
                if (meta.comment !== undefined)
                    irc.sendMsg('KICK ' + meta.channel + ' ' + meta.nick + ' :' + meta.comment);
                else
                    irc.sendMsg('KICK ' + meta.channel + ' ' + meta.nick);
            }
        },
        leave: {
            helpUsage: 'Usage: /leave [#channel] [comment]',
            helpText: [
                'Leave a channel.',
                'If channel omitted, leaves channel currently selected by /query.'
            ],
            parseParam: function (param, meta) {
                if (param === undefined) {
                    if (irc.target() === undefined) {
                        meta.error = cmdDefs['leave'].helpUsage;
                        return false;
                    }
                    else {
                        meta.channel = irc.target();
                    }
                }
                else {
                    var m = /^(\S+)(\s+(.+))?\s*$/.exec(param);
                    // Normalize channel name if it's missing a prefix.
                    meta.channel = m[1].replace(/^([^#&!])/, '#$1');
                    if (m[3] !== undefined) meta.comment = m[3];
                }
                
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to leave a channel.';
                    return false;
                }
            },
            exec: function (meta) {
                if (meta.comment !== undefined)
                    irc.sendMsg('PART ' + meta.channel + ' :' + meta.comment);
                else
                    irc.sendMsg('PART ' + meta.channel);
            }
        },
        nick: {
            helpUsage: 'Usage: /nick &lt;nickname&gt;',
            helpText: 'Change your nick.',
            parseParam: function (param, meta) {
                if (param === undefined) {
                    meta.error = cmdDefs['nick'].helpUsage;
                    return false;
                }
                
                var params = param.split(/\s+/, 1);
                meta.nick = params[0];

                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to change your nickname.';
                    return false;
                }
            },
            exec: function (meta) {
                irc.sendMsg('NICK ' + meta.nick);
            }
        },
        quit: {
            helpUsage: 'Usage: /quit [comment]',
            helpText: 'Quit IRC session.',
            parseParam: function (param, meta) {
                meta.comment = param;
            
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to quit.';
                    return false;
                }
            },
            exec: function (meta) {
                var comment = meta.comment !== undefined ? meta.comment : quitMessage;
                irc.sendMsg('QUIT :' + comment);
            }
        },
        mode: {
            helpUsage: 'Usage: /mode &lt;nick | channel&gt; [ &lt;+mode | -mode&gt; [parameters] ]',
            helpText: [
                'Get or change user or channel mode.',
                'Available user modes: http://tools.ietf.org/html/rfc2812#section-3.1.5',
                'Available channel modes: http://tools.ietf.org/html/rfc2811#section-4'
            ],
            parseParam: function (param, meta) {
                var usage = cmdDefs['mode'].helpUsage;
                var m = /^(\S+)(\s+(\S+(\s+\S+)*))?\s*$/.exec(param);
                if (m == null) {
                    meta.error = usage;
                    return false;
                }
                
                meta.target = m[1];
                
                if (m[3] !== undefined)
                    meta.modes = m[3].split(/\s+/);
            
                if (!irc.isActivated()) {
                    meta.error = 'Error: Must be connected to change mode.';
                    return false;
                }
            },
            exec: function (meta) {
                if (meta.modes !== undefined)
                    irc.sendMsg('MODE ' + meta.target + ' ' + meta.modes.join(' '));
                else
                    irc.sendMsg('MODE ' + meta.target);
            }
        }
    };

    // Send line from user entry.
    // Parse out client commands and execute action.
    // If not a command, send as message to current target.
    var sendLine = function (text) {
        // Parse out command and parameters.
        var m;
        if (m = /^\/(\S+)(\s+(.+))?/.exec(text)) {
            var cmd = m[1].toLowerCase();
            var param = m[3];
            
            if (cmdDefs[cmd] === undefined) {
                writeTmpl('error', { message: 'Error: Unknown client command "' + cmd + '".' });
            }
            else {
                var meta = {};
                var cmdDef = cmdDefs[cmd];
                if (cmdDef.parseParam && cmdDef.parseParam(param, meta) === false) {
                    if (meta.error) writeTmpl('error', { message: meta.error });
                }
                else {
                    cmdDef.exec(meta);
                }
            }
        }
        // Send text to selected target.
        else if (irc.isActivated()) {
            // Sanitize input.
            if (irc.target() !== undefined) {
                text = text.replace(/([\n\r])/gm, '');
                if (text.length > 0) {
                    sendLine('/msg ' + irc.target() + ' ' + text);
                }
            }
            else {
                writeTmpl('error', { message: 'Error: No target selected.  Use: /query <nick|#channel>.' });
            }
        }
        else {
            writeTmpl('error', { message: 'Error: Cannot send message, client not activated.' });
        }
        
        ircElement.find('.userEntry').val('');
    };

    var getTimestamp = function () {
        var d = new Date();
        return d.getHours() + ':' + padZero(d.getMinutes(), 2);
    };
    
    var padZero = function (n, digits) {
        var z = new Array(digits + 1).join('0');
        var pn = '' + z + n;
        return pn.substring(pn.length - digits);
    };

    var formatTime = function(time) {
        var d = new Date();
        d.setTime(time * 1000);
        return d.toLocaleString();
    };
    
    var isChannel = function (target) {
        return target.match(/^[#&!]/);
    };
    
    var stricmp = function (a, b) {
        return a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
    };
    
    var addToMsgSenders = function (nick) {
        if (stricmp(nick, irc.state().nick) != 0) {
            msgSenders = $.grep(msgSenders, function (val) {
                // Remove from array, if exists.
                return stricmp(val, nick) != 0;
            });
            msgSenders.unshift(nick);
            
            // Preserve placement of auto complete reply index so that additions to the list don't interfere.
            if (autoCompleteReplyIndex !== undefined) autoCompleteReplyIndex++;
        }
    };
        
    var startsWith = function (subject, prefix, comparer) {
        return subject.length >= prefix.length &&
            comparer(subject.substr(0, prefix.length), prefix) == 0;
    };

    // Find next match from a list, where the item is greater than seed.
    // comparer is function(a, b) returning -1, 0, or 1.
    var getNextMatch = function (list, seed, comparer) {
        if (list.length > 0) {
            if (seed === undefined || seed === null)
                return list[0];
                
            // Find next match.
            for (var i in list) {
                var val = list[i];
                if (comparer(val, seed) > 0) {
                    return val;
                }
            }
            
            // Wrap around to beginning of list.
            return list[0];
        }
        else {
            return undefined;
        }
    };          
                            
    // Convert URL patterns into HTML links.
    var linkifyURLs = function (html) {
        return html.replace(linkifyRegex, '<a href="$1" target="_blank">$1</a>');
    };
    var linkifyRegex = /(https?:\/\/([\w\-_]+(\.[\w\-_]+)*)(:\d+)?(\/[^\s\?\/<>()]*)*(\?([^\s=&<>()]+=[^\s=&<>()]*(&[^\s=&<>()]+=[^\s=&<>()]*)*)?)?(#[\w_\-]+)?)/g;;;;;;

    // Decorate nicks found in text with span.
    var decorateNicks = function (html, nicks) {
        var nickExpr = nicks.join('|');
        var re = new RegExp("\\b(" + nickExpr + ")\\b", 'ig');
        return html.replace(re, '<span class="nick">$1</span>');
    };

    // Decorate channel-like text with span.
    var decorateChannels = function (html) {
        return html.replace(/(^|\W)(#\w+)\b/g, '$1<span class="channel">$2</span>');
    };
    
    var clearSelection = function () {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        else if (document.selection) {
            document.selection.empty();
        }
    };

    var writeLine = function (html) {
        var ircChannel = ircElement.find('.ircChannel');
        var el = ircChannel.get(0);
        var lineElement;

        var write = function (element) {
            // Is the console's scroll within 4 pixels from the bottom?
            var atBottom = (el.scrollTop + 4) >= (el.scrollHeight - el.clientHeight);
            
            // Auto decorate nicks and channels in message.
            element.closest('.channelMsg').find('.message')
                .html(function (i, html) {
                    html = linkifyURLs(html);
                    if (irc.state() !== undefined) {
                        var nicks = $.map(irc.state().users, function (val, key) { return key; });
                        html = decorateNicks(html, nicks);
                    }
                    html = decorateChannels(html);
                    return html;
                });
            
            // Add doubleclick handler on nick and channel to auto-query.
            element.find('.nick,.channel')
                .dblclick(dblclickChannelNickHandler);
                
            // Detect if my nick was mentioned in a channel message.
            element.closest('.channelMsg').find('.message .nick')
                .filter(function () {
                    return irc.state() !== undefined &&
                        $(this).text().toLowerCase() == irc.state().nick.toLowerCase();
                })
                .first()
                .filter(function () {
                    // Check if this message is written by me.  If I wrote it, skip highlighting.
                    var prefixNick = element.find('.prefix .nick').text();
                    return irc.state() !== undefined &&
                        prefixNick.toLowerCase() != irc.state().nick.toLowerCase();
                })
                .each(function () {
                    element.closest('.channelMsg').addClass('nickHighlight');
                });

            // Add line to console.
            var lineElement = $('<div class="line"/>')
                .append(element)
                .appendTo(ircChannel);
                
            // Auto scroll to bottom if currently at bottom.
            if (atBottom) el.scrollTop = el.scrollHeight;
            
            return lineElement;
        };
        
        if (typeof(html) === 'object') {
            $.each(html, function (i, html) {
                var element = $('<div/>').append(html);
                lineElement = write(element.contents());
            });
        }
        else {
            var element = $('<div/>').append(html);
            lineElement = write(element.contents());
        }
        
        return lineElement;
    };
    
    var writeTmpl = function (templateName, data) {
        data['irc'] = irc;
        return writeLine(
            $('<div/>')
                .append($.tmpl(templateName, data))
                .html()
        );
    };

    // Resize elements to proper alignment based on ircMain's dimensions.
    var alignUI = function () {
        var ircMain = ircElement.find('.ircMain');
        var ircChannel = ircElement.find('.ircChannel');
        var userEntrySection = ircElement.find('.userEntrySection');
        var userEntryLine = ircElement.find('.userEntryLine');
        var userEntry = ircElement.find('.userEntry');
        var commandBar = ircElement.find('.commandBar');
        var sideBar = ircElement.find('.sideBar');
        var channelList = sideBar.find('.channelList');
        ircChannel
            .width(ircMain.width())
            .height(ircMain.height());
        userEntrySection.outerWidth(ircMain.outerWidth());
        userEntryLine
            .width(userEntrySection.width())
            .innerHeight(userEntry.outerHeight() + 4 /* margin not included in outerHeight? */);
        userEntry.width(userEntryLine.width());
        commandBar.outerWidth(ircMain.outerWidth());
        sideBar.outerHeight(ircMain.outerHeight() + userEntrySection.outerHeight());
        channelList.height(sideBar.height());
    };

    var dblclickChannelNickHandler = function () {
        // Get text of element, ignoring child elements.
        var target = $(this)
            .clone()
            .children()
            .remove()
            .end()
            .text();
            
        if (irc.state() !== undefined && target != irc.state().nick) {
            if (isChannel(target)) {
                // Check if joined to this channel.
                if (irc.state() !== undefined && irc.state().channels[target] === undefined)
                    sendLine('/join ' + target);
                else
                    queryTarget(target);
            }
            else {
                queryTarget(target);
            }
                        
            ircElement.find('.userEntry').focus();
        }

        // Unselect doubleclicked text.
        clearSelection();
        //return false;
    };
                
    var queryTarget = function (target) {
        var prevTarget = irc.target();
        
        irc.target(target);

        writeTmpl((target === undefined) ? 'queryOff' : 'query', {
            target: target,
            prevTarget: prevTarget
        });

        // Update user mode line.
        ircElement.find('.targetFragment').fadeOut(null, function () {
            ircElement.find('.targetLabel').text(target);
            if (target !== undefined && target !== null) {
                ircElement.find('.targetFragment').fadeIn();
            }
        });
    };
    
    var getJoinedChannels = function () {
        var channels = [];
        
        if (irc.state() !== undefined) {
            for (var channel in irc.state().channels) {
                channels.push(channel);
            }
        }

        return channels.sort(stricmp);
    };
    
    var getChannelMembers = function(channel) {
        var members = [];
        
        if (irc.state() !== undefined) {
            var channelDesc = irc.state().channels[channel];
            
            if (channelDesc !== undefined) {
                for (var member in channelDesc.members) {
                    members.push(member);
                }
            }
        }
        
        return members.sort(stricmp);
    };
    
    var refreshSideBar = function () {
        if (irc.state() === undefined) return;
        
        // TODO: Incrementally update channel/member lists to avoid rendering flaws of concurrent actions,
        // such as incoming messages and user actions both changing state.
        var channelList = ircElement.find('.sideBar ul.channelList');
        var originalScrollTop = channelList.get(0).scrollTop;
        
        channelList.empty();

        $.each(getJoinedChannels(), function (i, channel) {
            var channelDesc = irc.state().channels[channel];
            var channelElement = $('<li><span class="channel">' + channel + '</span><span class="leaveButton" title="Leave channel"></span></li>')
                // Set topic as tooltip.
                .find('.channel')
                    .attr('title', channelDesc.topic)
                    .end()
                // Setup leave channel icon.
                .find('.leaveButton')
                    .click(function () {
                        // Update UI and leave the channel.
                        $(this).parent('li')
                            .slideUp(400, 'swing', function () {
                                sendLine('/leave ' + channel);
                            });
                    })
                    .end()
                .appendTo(channelList);
            
            var memberList = $('<ul class="memberList"/>')
                .appendTo(channelElement);
                
            
            $.each(getChannelMembers(channel), function (i, member) {
                var memberDesc = channelDesc.members[member];
                $('<li><span class="mode">' + memberDesc.mode + '</span><span class="nick">' + member + '</span></li>')
                    .appendTo(memberList);
            });
        });
        
        // Scroll back to original spot.
        channelList.get(0).scrollTop = originalScrollTop;
        
        // Apply doubleclick handler to channels and nicks.
        channelList.find('.nick,.channel')
            .dblclick(dblclickChannelNickHandler);
    };
    
    //
    // Initialization.
    //
    // Client command aliases.
    cmdDefs['j'] = cmdDefs['join'];
    cmdDefs['k'] = cmdDefs['kick'];
    cmdDefs['l'] = cmdDefs['leave'];
    cmdDefs['m'] = cmdDefs['msg'];
    cmdDefs['n'] = cmdDefs['notice'];
    cmdDefs['q'] = cmdDefs['query'];

    // Compile templates.
    $.each(tmpls, function (name, tmpl) {
        $.template(name, tmpl);
    });

    // Track browser window focus.
    // TODO: Test in IE.  May need to bind to $(document).
    $(window)
        .focus(function () {
            // Restore title when user comes back to the window.
            document.title = defaultTitle;
            isWindowFocused = true;
        })
        .blur(function () {
            isWindowFocused = false;
        });
    
    // Setup chatmore event handlers.
    ircElement
        .bind('localMessage', function (e, message, type) {
            writeTmpl(type, { message: message });
        })
        .bind('processingMessage', function (e, msg) {
            switch (msg.type) {
            case 'state':
                prevState = irc.state();
                break;
            }
        })
        .bind('processedMessage', function (e, msg) {
            switch (msg.type) {
            case 'state':
                if (prevState === undefined || irc.state().nick != prevState.nick) {
                    // Nick changed.
                    var nickLabel = ircElement.find('.nickLabel');
                    nickLabel.fadeOut(null, function () {
                        nickLabel.text(irc.state().nick);
                        nickLabel.fadeIn();
                    });
                }

                // Auto-query first channel if selected channel is no longer joined.
                if (irc.target() !== undefined && irc.state().channels[irc.target()] === undefined) {
                    queryTarget(getJoinedChannels()[0]);
                }
                
                refreshSideBar();
                break;

            case 'recv':
                switch (msg.command) {
                case 'PRIVMSG':
                    // Update title when new messages arrive and user isn't focused on the browser.
                    if (!isWindowFocused) {
                        document.title = notificationTitle;
                    }

                    if (msg.info.target.toLowerCase() == irc.state().nick.toLowerCase()) {
                        writeTmpl(msg.info.isAction ? 'incomingPrivateAction' : 'incomingPrivateMsg', {
                            clientNick: irc.state().nick,
                            nick: msg.prefixNick,
                            message: msg.info.text
                        });
                        if (!msg.info.isAction) {
                            // Add this sender to the history of senders.
                            addToMsgSenders(msg.prefixNick);
                        }
                    }
                    else
                        writeTmpl(msg.info.isAction ? 'incomingChannelAction' : 'incomingChannelMsg', {
                            clientNick: irc.state().nick,
                            nick: msg.prefixNick,
                            channel: msg.info.target,
                            message: msg.info.text
                        });
                    break;
                    
                case 'NOTICE':
                    // Update title when new messages arrive and user isn't focused on the browser.
                    if (!isWindowFocused) {
                        document.title = notificationTitle;
                    }

                    if (msg.info.target.toLowerCase() == irc.state().nick.toLowerCase()) {
                        writeTmpl('incomingPrivateNotice', {
                            clientNick: irc.state().nick,
                            nick: msg.prefixNick,
                            message: msg.info.text
                        });

                        // Add this sender to the history of senders.
                        addToMsgSenders(msg.prefixNick);
                    }
                    else
                        writeTmpl('incomingChannelNotice', {
                            clientNick: irc.state().nick,
                            nick: msg.prefixNick,
                            channel: msg.info.target,
                            message: msg.info.text
                        });
                    break;
                    
                case 'JOIN':
                    writeTmpl('join', {
                        nick: msg.prefixNick,
                        ident: msg.prefixUser,
                        host: msg.prefixHost,
                        channel: msg.info.channel
                    });
                    
                    // Auto-query newly joined channel.
                    if (stricmp(msg.prefixNick, irc.state().nick) == 0) {
                        queryTarget(msg.info.channel);
                    }
                    break;
                    
                case 'PART':
                    writeTmpl('leave', {
                        nick: msg.prefixNick,
                        ident: msg.prefixUser,
                        host: msg.prefixHost,
                        channel: msg.info.channel,
                        comment: msg.info.comment
                    });
                    break;
                    
                case 'KICK':
                    $.each(msg.info.kicks, function (i, kick) {
                        writeTmpl('kick', {
                            channel: kick.channel,
                            nick: kick.nick,
                            op: msg.prefixNick,
                            comment: msg.info.comment
                        });
                    });
                    break;
                    
                case 'MODE':
                    writeTmpl('userMode', {
                        nick: msg.prefixNick,
                        target: msg.info.target,
                        mode: msg.info.mode
                    });
                    break;
                
                case 'NICK':
                    writeTmpl('nick', {
                        clientNick: irc.state().nick,
                        nick: msg.info.nick,
                        prevNick: msg.prefixNick
                    });
                    
                    // If selected target's nick changes, update target.
                    if (stricmp(msg.prefixNick, irc.target()) == 0) {
                        queryTarget(msg.info.nick);
                    }
                    break;
                    
                case 'TOPIC':
                    writeTmpl('changeTopic', {
                        clientNick: irc.state().nick,
                        channel: msg.info.channel,
                        nick: msg.prefixNick,
                        topic: msg.info.topic
                    });
                    break;
                    
                case 'QUIT':
                    writeTmpl('quit', {
                        nick: msg.prefixNick,
                        message: msg.info.message
                    });
                    break;
                    
                case 'ERROR':
                    writeTmpl('error', {
                        message: msg.info.message
                    });
                    break;

                case '331': // RPL_NOTOPIC
                    writeTmpl('notopic', {
                        channel: msg.info.channel
                    });
                    break;
                    
                case '332': // RPL_TOPIC
                    writeTmpl('topic', {
                        channel: msg.info.channel,
                        topic: msg.info.topic
                    });
                    break;
                    
                case '333': // Topic set by
                    writeTmpl('topicSetBy', {
                        channel: msg.info.channel,
                        nick: msg.info.nick,
                        time: msg.info.time
                    });
                    break;
                    
                case '391': // RPL_TIME
                    writeTmpl('serverTime', {
                        server: msg.info.server,
                        timeString: msg.info.timeString
                    });
                    break;
                    
                case '433': // ERR_NICKNAMEINUSE
                    writeTmpl('nickInUse', {
                        nick: msg.info.nick
                    });
                    break;
                    
                case '353':
                case '366':
                    // Disregard these messages.
                    break;
                    
                default:
                    if (/^\d{3}$/.test(msg.command)) {
                        // Any other server message.
                        var m;
                        if (m = /:(.+)/.exec(msg.params)) {
                            writeTmpl('serverMsg', { message: m[1] });
                        }
                    }
                    
                    break;
                }
            }
        })
        .bind('sendMsg', function (e, rawMsg) {
            if (console) console.log('Sent: ' + rawMsg);
        })
        .bind('activatingClient', function (e, stage, message) {
            switch (stage) {
            case 'start':
                ircElement.find('.userEntry').focus();
                break;
                
            case 'connecting':
                writeTmpl('clientMsg', { message: 'Connecting to IRC server ' + server });
                break;
                
            case 'resuming':
                writeTmpl('clientMsg', { message: 'Resuming existing IRC connection to ' + server });
                break;
                
            case 'activated':
                ircElement
                    .removeClass('deactivated')
                    .addClass('activated');
                reactivateAttempts = 0;
                
                // Auto-query first channel on activation.
                var firstChannel = getJoinedChannels()[0];
                if (firstChannel !== undefined) queryTarget(firstChannel);
                
                break;

            case 'error':
                writeTmpl('error', { message: message });
                break;
            }
        })
        .bind('deactivatingClient', function () {
            // Attempt reactivation.
            if (reactivateAttempts < maxReactivateAttempts) {
                writeTmpl('error', { message: 'Server connection lost.  Retrying connection in ' + reactivateDelay + ' seconds...' });

                setTimeout(function () {
                    reactivateAttempts++;
                    irc.activateClient();
                }, reactivateDelay * 1000);
            }
            else {
                writeTmpl('error', { message: 'Server connection lost and will not reconnect.  Sorry about that.' });
            }
        });
        
    // Setup user entry event handlers.
    ircElement.find('.userEntry')
        .click(function (e) {
            // Clicking on user entry assumes changing selection; clears autocomplete state.
            autoCompleteReplyIndex = undefined;
            autoCompletePrefix = undefined;
        })
        .keydown(function (e) {
            if (e.keyCode >= '32' && autoCompletePrefix !== undefined) {
                // Typing text on an autocomplete suggestion will clear the selection,
                // then add the character after the suggestion,
                // instead of default of deleting the suggestion and adding a space.
                ircElement.find('.userEntry').each(function () {
                    this.selectionStart = this.selectionEnd;
                    return;
                });
            }
            
            if (e.keyCode == '13') {
                // Enter.
                sendLine(ircElement.find('.userEntry').val());
                return false;
            }
            else if (e.keyCode == '9') {
                // Tab.
                if (e.preventDefault) e.preventDefault();   // Firefox: block default Tab functionality.
                
                if (irc.isActivated()) {
                    var userEntry = ircElement.find('.userEntry').val();
                    
                    if (userEntry == '' || autoCompleteReplyIndex !== undefined) {
                        if (msgSenders.length) {
                            if (autoCompleteReplyIndex === undefined) autoCompleteReplyIndex = 0;
                            
                            // Quick send message to next recent sender.
                            ircElement.find('.userEntry').val('/msg ' + msgSenders[autoCompleteReplyIndex] + ' ');
                            
                            autoCompleteReplyIndex++;
                            if (autoCompleteReplyIndex >= msgSenders.length) autoCompleteReplyIndex = 0;
                        }
                    }
                    else {
                        // Autocomplete.
                        var caretPos = ircElement.find('.userEntry').get(0).selectionEnd;
                        if (autoCompletePrefix === undefined) {
                            // Advance caret to end of word.
                            var m1 = userEntry.substr(caretPos).match(/^\S+/);
                            if (m1 != null) caretPos += m1[0].length;
                            
                            // Get last word of user entry, up to the caret position.
                            var m2 = /\S+$/.exec(userEntry.substr(0, caretPos));
                            if (m2 !== null) {
                                autoCompletePrefix = m2[0];
                            }
                        }
                        else {
                            // Delete selected text from last suggestion.
                            ircElement.find('.userEntry').each(function () {
                                var s = '';
                                if (this.selectionStart > 0) s += userEntry.substr(0, this.selectionStart);
                                if (this.selectionEnd < userEntry.length) s += userEntry.substr(this.selectionEnd);
                                userEntry = s;
                                this.selectionEnd = this.selectionStart;
                                caretPos = this.selectionStart;
                            });
                        }
                        
                        if (autoCompletePrefix !== undefined) {
                            var myNick = irc.state().nick;
                            
                            if (isChannel(autoCompletePrefix)) {
                                // When string looks like a channel, autocomplete from joined channel list.
                                var channels = $.grep(getJoinedChannels(), function (val) {
                                    return startsWith(val, autoCompletePrefix, stricmp) && stricmp(val, myNick) != 0;
                                });
                                
                                autoCompleteSuggest = getNextMatch(channels, autoCompleteSuggest, stricmp);
                                    
                                // Replace last word with autoCompleteSuggest.
                                if (autoCompleteSuggest !== undefined) {
                                    var s = userEntry.substr(0, caretPos).replace(/(\S+)$/, autoCompleteSuggest);
                                    userEntry = s + userEntry.substr(caretPos);
                                    ircElement.find('.userEntry')
                                        .val(userEntry)
                                        .each(function () {
                                            // Select suggested portion of autocomplete.
                                            this.selectionStart = s.length - autoCompleteSuggest.length + autoCompletePrefix.length;
                                            this.selectionEnd = s.length;
                                        });
                                }
                            }
                            else if (irc.target() !== undefined && isChannel(irc.target())) {
                                // When a channel is selected, autocomplete that channel's users.
                                var nicks = $.grep(getChannelMembers(irc.target()), function (val) {
                                    return startsWith(val, autoCompletePrefix, stricmp) && stricmp(val, myNick) != 0;
                                });
                                
                                autoCompleteSuggest = getNextMatch(nicks, autoCompleteSuggest, stricmp);
                                    
                                // Replace last word with autoCompleteSuggest.
                                if (autoCompleteSuggest !== undefined) {
                                    var s = userEntry.substr(0, caretPos).replace(/(\S+)$/, autoCompleteSuggest);
                                    var wordpos = s.length - autoCompleteSuggest.length;
                                    // If this is the only word on the line, assume it's to address the suggested user.
                                    if (wordpos == 0) s += ': ';
                                    userEntry = s + userEntry.substr(caretPos);
                                    ircElement.find('.userEntry')
                                        .val(userEntry)
                                        .each(function () {
                                            // Select suggested portion of autocomplete.
                                            this.selectionStart = wordpos + autoCompletePrefix.length;
                                            this.selectionEnd = s.length;
                                        });
                                }
                            }
                        }
                    }
                }
                
                return false;
            }
            else {
                // All other keyboard activity clears autocomplete state.
                autoCompleteReplyIndex = undefined;
                autoCompletePrefix = undefined;
            }
        })
        .focus();
    
    // Setup resizable console.
    ircElement.find('.ircMain').resizable({
        handles: 'se',
        minWidth: 400,
        minHeight: 175,
        resize: function () {
            alignUI();
        }
    });
    
    alignUI();
    
    irc.activateClient();
});
