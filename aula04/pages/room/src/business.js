class Business {
    constructor({ room, media, view, socketBuilder, peerBuilder }) {
        this.media = media;
        this.room = room;
        this.view = view;
        this.socketBuilder = socketBuilder;
        this.peerBuilder = peerBuilder;
        this.currentStream = {};
        this.socket = {};
        this.currentPeer = {};
        this.peers = new Map();
        this.userRecordings = new Map();
    }

    static initialize(deps) {
        const instance = new Business(deps);
        return instance._init();
    }

    async _init() {
        this.view.configureRecordButton(this.onRecordPressed.bind(this));
        this.view.configureLeaveButton(this.onLeavePressed.bind(this));

        this.currentStream = await this.media.getCamera();
        this.socket = this.socketBuilder.setOnUserConnected(this.onUserConnected()).setOnUserDisconnected(this.onUserDisconnected()).build();
        this.currentPeer = await this.peerBuilder
            .setOnError(this.onPeerError())
            .setOnConnectionOpened(this.onPeerConnectionOpened())
            .setOnCallReceived(this.onPeerCallReceived())
            .setOnPeerStreamReceived(this.onPeerStreamReceived())
            .setOnCallError(this.onPeerCallError())
            .setOnCallClosed(this.onPeerCallClosed())
            .build();

        this.addVideoStream(this.currentPeer.id);
    }

    addVideoStream(userId, stream = this.currentStream) {
        const recorderInstance = new Recorder(userId, stream);
        this.userRecordings.set(recorderInstance.filename, recorderInstance);
        if (this.recordingEnabled) {
            recorderInstance.startRecording();
        }

        const isCurrentId = userId === this.currentPeer.id;

        this.view.renderVideo({
            userId,
            stream,
            isCurrentId
        });
    }

    onUserConnected() {
        return (userId) => {
            console.log('User connected: ', userId);
            this.currentPeer.call(userId, this.currentStream);
        };
    }

    onUserDisconnected() {
        return (userId) => {
            console.log('User disconnected: ', userId);

            if (this.peers.has(userId)) {
                this.peers.get(userId).call.close();
                this.peers.delete(userId);
            }

            this.view.setParticipants(this.peers.size);
            this.stopRecording(userId);
            this.view.removeVideoElement(userId);
        };
    }

    onPeerError() {
        return (error) => {
            console.log('Peer error: ', error);
        };
    }

    onPeerConnectionOpened() {
        return (peer) => {
            const id = peer.id;
            this.socket.emit('join-room', this.room, id);
            console.log('Peer connection opened: ', id);
        };
    }

    onPeerCallReceived() {
        return (call) => {
            console.log('Peer call received: ', call);
            call.answer(this.currentStream);
        };
    }

    onPeerStreamReceived() {
        return (call, stream) => {
            const callerId = call.peer;

            if (this.peers.has(callerId)) {
                console.log('Calling twice, ignoring second call ID: ', callerId);
                return;
            }

            this.addVideoStream(callerId, stream);
            this.peers.set(callerId, { call });
            this.view.setParticipants(this.peers.size);
            console.log('Peer stream received: ', callerId);
        };
    }

    onPeerCallError() {
        return (call, error) => {
            console.log('Peer error: ', error);
            this.view.removeVideoElement(call.peer);
        };
    }

    onPeerCallClosed() {
        return (call) => {
            console.log('Peer connection closed: ', call.peer);
        };
    }

    onRecordPressed(recordingEnabled) {
        this.recordingEnabled = recordingEnabled;
        console.log('Recording button pressed: ', this.recordingEnabled);

        for (const [key, value] of this.userRecordings) {
            if (this.recordingEnabled) {
                value.startRecording();
                continue;
            }

            this.stopRecording(key);
        }
    }

    onLeavePressed() {
        this.userRecordings.forEach((value, key) => value.download());
    }

    // Se um usuário entrar e sair da call durante uma gravação
    // precisa parar as gravações anteriores do mesmo.
    async stopRecording(userId) {
        const userRecordings = this.userRecordings;
        for (const [key, value] of userRecordings) {
            const isContextUser = key.includes(userId);
            if (!isContextUser) continue;

            const rec = value;
            const isRecordingActive = rec.recordingActive;
            if (!isRecordingActive) continue;

            await rec.stopRecording();
            this.playRecordings(key);
        }
    }

    playRecordings(userId) {
        const user = this.userRecordings.get(userId);
        const videoURLs = user.getAllVideoURLs();
        videoURLs.map((url) => this.view.renderVideo({ url, userId }));
    }
}
