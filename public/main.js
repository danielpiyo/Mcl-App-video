document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("room-name-form");
  const roomNameInput = document.getElementById("room-name-input");
  const container = document.getElementById("video-container");
  const controls = document.getElementById("controls");
  const toggleVideoButton = document.getElementById("pause-video-button");
  const muteAudioButton = document.getElementById("mute-audio-button");
  let room;
  let videoTrack;

  const startRoom = async (event) => {
    // prevent a page reload when a user submits the form
    event.preventDefault();
    // hide the join form
    form.style.visibility = "hidden";
    // show the controls
    controls.style.display = "block";
    // retrieve the room name
    const roomName = roomNameInput.value;

    // fetch an Access Token from the join-room route
    const response = await fetch("/join-room", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomName: roomName }),
    });
    const { token } = await response.json();

    // join the video room with the token
    room = await joinVideoRoom(roomName, token);

    // render the local and remote participants' video and audio tracks
    handleConnectedParticipant(room.localParticipant);
    room.participants.forEach(handleConnectedParticipant);
    room.on("participantConnected", handleConnectedParticipant);

    // handle cleanup when a participant disconnects
    room.on("participantDisconnected", handleDisconnectedParticipant);
    window.addEventListener("pagehide", () => room.disconnect());
    window.addEventListener("beforeunload", () => room.disconnect());
  };

  const handleConnectedParticipant = (participant) => {
    // create a div for this participant's tracks
    const participantDiv = document.createElement("div");
    participantDiv.setAttribute("id", participant.identity);
    container.appendChild(participantDiv);

    // iterate through the participant's published tracks and
    // call `handleTrackPublication` on them
    participant.tracks.forEach((trackPublication) => {
      handleTrackPublication(trackPublication, participant);
    });

    // listen for any new track publications
    participant.on("trackPublished", handleTrackPublication);
  };

  const handleTrackPublication = (trackPublication, participant) => {
    function displayTrack(track) {
      // append this track to the participant's div and render it on the page
      const participantDiv = document.getElementById(participant.identity);
      // track.attach creates an HTMLVideoElement or HTMLAudioElement
      // (depending on the type of track) and adds the video or audio stream
      participantDiv.append(track.attach());
    }

    // check if the trackPublication contains a `track` attribute. If it does,
    // we are subscribed to this track. If not, we are not subscribed.
    if (trackPublication.track) {
      displayTrack(trackPublication.track);
    }

    // listen for any new subscriptions to this track publication
    trackPublication.on("subscribed", displayTrack);
  };

  const handleDisconnectedParticipant = (participant) => {
    // stop listening for this participant
    participant.removeAllListeners();
    // remove this participant's div from the page
    const participantDiv = document.getElementById(participant.identity);
    participantDiv.remove();
  };

  const joinVideoRoom = async (roomName, token) => {
    // join the video room with the Access Token and the given room name
    const room = await Twilio.Video.connect(token, {
      room: roomName,
    });
    return room;
  };

  toggleVideoButton.addEventListener("click", () => {
    if (room && room.localParticipant.videoTracks.size > 0) {
      videoTrack = Array.from(room.localParticipant.videoTracks.values())[0]
        .track;
      videoTrack.enable(!videoTrack.isEnabled);
      toggleVideoButton.textContent = videoTrack.isEnabled
        ? "Pause Video"
        : "Resume Video";
    }
  });

  muteAudioButton.addEventListener("click", () => {
    if (room && room.localParticipant.audioTracks.size > 0) {
      const audioTrack = Array.from(
        room.localParticipant.audioTracks.values()
      )[0].track;
      audioTrack.enable(!audioTrack.isEnabled);
      muteAudioButton.textContent = audioTrack.isEnabled
        ? "Mute Audio"
        : "Unmute Audio";
    }
  });

  form.addEventListener("submit", startRoom);
});
