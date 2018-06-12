let Transform = require('stream').Transform
let SignalK = require('@signalk/client')

class WebsocketProvider extends Transform {
    signalkClient = new SignalK.Client();
    connectInterval; //store the 'timer' so we can clear it when we get successfully reconnected
    signalKConnection; //store the connection so we're able to disconnect

    constructor(private options) {
        super({ objectMode: true });
        if (!options.url) {
            if (!(options.host && options.port)) throw "WebsocketProvider requires a url or a host and port.";
            options.url = `ws://${options.host}:${options.port}/signalk/v1/stream?subscribe=all`
        }

        this.connect();
    }

    connect() {
        this.signalKConnection = this.signalkClient.connectDeltaByUrl(
            this.options.url,
            data => this.push(data), //onData: when a delta is received, pass it on

            connection => {
                console.log('Websocket connection established');
                clearInterval(this.connectInterval);
                connection.subscribeAll();
            }, //onConnect

            () => { }, //onDisconnect

            err => {
                if(err.errno == 'ECONNRESET') {
                    console.log('The websocket connection was reset. Attempting to reconnect...');
                    this.reconnect();
                }
            }, //onError: if our connection was reset, try to reconnect

            () => this.reconnect() //onClose: if the connection is closed (or doesn't connect successfully) try again
        )
        
    }
    
    reconnect() {
        this.signalKConnection.disconnect();
        clearInterval(this.connectInterval);
        this.connectInterval = setInterval(() => this.connect(), 5000);
    }
}

export = WebsocketProvider;