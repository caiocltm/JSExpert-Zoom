class View {
    constructor() {
        this.recordBtn = document.getElementById('record');
        this.leaveBtn = document.getElementById('leave');
    }

    createVideoElement({ muted = true, src, srcObject }) {
        const video = document.createElement('video');
        video.muted = muted;
        video.src = srcObject;
        video.srcObject = srcObject;

        if (src) {
            video.controls = true;
            video.loop = true;
            Util.sleep(200).then((_) => video.play());
        }

        if (srcObject) {
            video.addEventListener('loadedmetadata', (_) => video.play());
        }

        return video;
    }

    renderVideo({ userId, stream = null, url = null, isCurrentId = false }) {
        const video = this.createVideoElement({
            muted: isCurrentId,
            src: url,
            srcObject: stream
        });
        this.appendToHTMLTree(userId, video, isCurrentId);
    }

    appendToHTMLTree(userId, video, isCurrentId) {
        const div = document.createElement('div');
        div.id = userId;
        div.classList.add('wrapper');
        div.append(video);

        const div2 = document.createElement('div');
        div2.innerText = isCurrentId ? '' : userId;
        div.append(div2);

        const videoGrid = document.getElementById('video-grid');
        videoGrid.append(div);
    }

    setParticipants(counts) {
        const myself = 1;
        const participants = document.getElementById('participants');
        participants.innerHTML = counts + myself;
    }

    removeVideoElement(partipantId) {
        const partipantGrid = document.getElementById(partipantId);

        if (!partipantGrid) return;

        partipantGrid.remove();
    }

    toggleRecordingButtonColor(isActive = true) {
        this.recordBtn.style.color = isActive ? 'red' : 'white';
    }

    onRecordClick(command) {
        this.recordingEnabled = false;
        return () => {
            const isActive = (this.recordingEnabled = !this.recordingEnabled);
            command(this.recordingEnabled);
            this.toggleRecordingButtonColor(isActive);
        };
    }

    onLeaveClick(command) {
        return async () => {
            command();
            await Util.sleep(1000);
            window.location = '/pages/home';
        };
    }

    configureRecordButton(command) {
        this.recordBtn.addEventListener('click', this.onRecordClick(command));
    }

    configureLeaveButton(command) {
        this.leaveBtn.addEventListener('click', this.onLeaveClick(command));
    }
}
