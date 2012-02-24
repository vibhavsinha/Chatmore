<?
function redirectNewViewKey() {
    // Generate random viewKey string.
    $viewKey = substr(base_convert(rand(0, 1679616), 10, 36) . base_convert(rand(0, 1679616), 10, 36), 0, 8);
    $_GET['viewKey'] = $viewKey;
    $redirectUrl = $_SERVER['SCRIPT_URI'] . '?' . http_build_query($_GET);
    
    header('Location: ' . $redirectUrl);
}

// Check for viewKey in querystring.
// If not found, generate one and redirect back with viewKey included.
if (!isset($_GET['viewKey'])) {
    redirectNewViewKey();
    exit;
}

require_once 'config.php';

// Parse querystring into options array to pass to chatmore.
$opts = array(
    'viewKey' => $_GET['viewKey']
);

if (isset($_GET['nick'])) $opts['nick'] = $_GET['nick'];
if (isset($_GET['realname'])) $opts['realname'] = $_GET['realname'];
if (isset($_GET['server'])) $opts['server'] = $_GET['server'];
if (isset($_GET['port'])) $opts['port'] = intval($_GET['port']);
    

session_start();

// If 'x' parameter exists in query string, reset session state.
if (array_key_exists('x', $_GET)) {
    session_destroy();

    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
}

?>
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Experimental IRC chat client</title>
    <base href="<?=$scriptPath?>/" />
    <link rel="stylesheet" type="text/css" href="style.css" />
    <link rel="stylesheet" type="text/css" href="themes/atwood/atwood.css" />
    <script type="text/javascript" src="jquery-1.7.1.min.js"></script>
    <script type="text/javascript" src="jquery-ui-1.8.16.min.js"></script>
    <script type="text/javascript" src="jquery.tmpl.min.js"></script>
    <script type="text/javascript" src="chatmoreState.js"></script>
    <script type="text/javascript" src="chatmore.js"></script>
    <script type="text/javascript" src="chatmoreUI.js"></script>
    <script type="text/javascript" src="config.js"></script>
    <script type="text/javascript">
        $(function () {
            var getChannelsFromHash = function () {
                var channels = document.location.hash.split(',');
                if (channels[0] == '') return [ ];
                else return channels;
            };
            
            var setHashWithChannels = function (channels) {
                var hash = channels.sort().join(',');
                if (document.location.hash !== hash) document.location.hash = hash;
            };

            var newViewKey = function () {
                return Math.random().toString(36).substr(2, 8);
            };
            
            var getQueryString = function () {
                var m = window.location.search.match(/^\?(.+)/);
                if (m) return m[1];
            };
            
            // http://stackoverflow.com/a/647272/3347
            var parseQueryString = function (qs) {
                var result = { };
                var queryString = location.search.substring(1);
                var re = /([^&=]+)=([^&]*)/g;
                var m;
                
                while (m = re.exec(queryString)) {
                    result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
                }

                return result;
            };
            
            toQueryString = function (arr) {
                var args = $.map(arr, function (val, key) {
                    if (val === undefined || val === null)
                        return encodeURIComponent(key);
                    else
                        return encodeURIComponent(key) + '=' + encodeURIComponent(val);
                });
                return args.join('&');
            };

            // Resize client to match window.
            $(window).resize(function () {
                $('#chatmore').chatmore('resizeMax');
            });

            // Provide popup warning when navigating away from this page.
            var warnOnUnload = true;
            $(window).on('beforeunload', function () {
                if (warnOnUnload) return 'You are about to navigate away from the Chatmore IRC client, which may disconnect from your session.';
            });

            // Prepare chatmore options.
            var opts = $.extend({ }, chatmoreDefaults);
            var userOpts = <?=json_encode($opts)?>;
            $.extend(opts, userOpts);
            
            // Event handlers.
            opts.stateChanged = function (e, state) {
                //if (window.console) console.log('User event: stateChanged');
                setHashWithChannels(state.getChannels());
            };
            
            opts.processedMessage = function (e, msg) {
                //if (window.console) console.log('User event: processedMessage');
                if (msg.type === 'servermsg' && msg.code === 402) {
                    if (window.console) console.warn('Got session deleted error.  Generating new viewKey and reactivating...');
                    
                    // Session deleted error during activation.  Generate new viewKey and reactivate.
                    var query = parseQueryString(getQueryString());
                    query['viewKey'] = newViewKey();

                    if (window.history.replaceState) {
                        // HTML5: Restart client with new viewKey without reloading; update URL to reflect viewKey.
                        var updatedUrl = document.location.pathname + '?' + toQueryString(query) + document.location.hash;
                        window.history.replaceState(null, document.title, updatedUrl);
                        opts.viewKey = query['viewKey'];
                        opts.channels = getChannelsFromHash();
                        $('#chatmore')
                            .chatmore(opts)
                            .chatmore('resizeMax');
                    }
                    else {
                        // HTML4: Redirect back with new viewKey.
                        warnOnUnload = false;
                        document.location.search = '?' + toQueryString(query);
                    }
                }
            };
            
            // Parse hash string for channels.
            var channels = getChannelsFromHash();
            if (channels.length > 0) opts.channel = channels;
            
            // Startup the IRC client.
            $('#chatmore')
                .chatmore(opts)
                .chatmore('resizeMax');
        });
    </script>
</head>
<body>

    <div id="chatmore" class="chatmore"></div>
    <div id="connectionDialog"></div>
</body>
</html>
