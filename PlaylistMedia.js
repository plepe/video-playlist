const EventEmitter = require('events')

/**
 * @typedef {Object} MediaItem - an entry in the playlist
 * @property {string} video href of video file
 * @property {string} audio href of audio file
 * @property {number} videoDuration duration of the video in seconds (will be set/updated of the real duration, when the metadata has been loaded)
 * @property {number} audioDuration duration of the audio in seconds (will be set/updated of the real duration, when the metadata has been loaded)
 * @property {Action[]} actions Actions which will be executed at certain positions in the video/audio
 */

/**
 * @typedef {Object} Action - an action to be executed at a certain position in a video/audio
 * @property {string|number} time timestamp when to execut the action in seconds or 'end'
 * @property {number} [pause] pause the video for the specified amount of seconds
 * @property {DOMNode} [title] A DOMNode which will be shown over the video
 * @property {number} [titleDuration] Duration for which this title is shown
 */

/**
 * PlaylistMedia - class that plays a list of media files consecutively
 */
class PlaylistMedia extends EventEmitter {
  /**
   * @param {MediaItem[]} list list of media items
   * @param {Object} options options
   */
  constructor (list, options) {
    super()
    this.list = list
    this.preloadIndex = 0
    this.options = options
    this.dom = this.options.dom

    this.preloadList = []
    this.current = null

    this.preloadListInit()
    this.preload()
  }

  preloadListInit () {
    for (let i = 0; i < 3; i++) {
      const entry = {
        index: null,
        video: document.createElement('video'),
        audio: new window.Audio()
      }

      entry.video.onended = () => this.end()
      entry.video.preload = 'auto'
      entry.video.controls = true
      entry.video.onloadedmetadata = () => {
        this.list[entry.index].videoDuration = entry.video.duration
      }
      entry.video.onseeked = () => this.calcNextAction()
      entry.video.onseeking = () => this.calcNextAction()
      entry.audio.onended = () => this.end()
      entry.audio.preload = 'auto'
      entry.audio.onloadedmetadata = () => {
        this.list[entry.index].audioDuration = entry.audio.duration
      }

      this.preloadList.push(entry)
    }
  }

  preload () {
    this.preloadList.forEach(preload => {
      if (preload.index !== null) {
        return
      }

      preload.index = this.preloadIndex++
      if (preload.index >= this.list.length) {
        preload.index = null
        return
      }

      const entry = this.list[preload.index]

      preload.video.src = entry.video || null
      preload.audio.src = entry.audio || null
    })
  }

  /**
   * play - start playing playlist
   */
  play () {
    while (this.dom.firstChild) {
      this.dom.removeChild(this.dom.firstChild)
    }

    this.current = this.preloadList.shift()

    this.index = this.current.index
    if (this.index === null) {
      return
    }

    const entry = this.list[this.index]

    if (entry.video) {
      this.options.dom.appendChild(this.current.video)
      this.current.video.play()
    }
    if (entry.audio) {
      this.current.audio.play()
    }

    this.emit('play', entry)

    this.current.actionIndex = 0
    this.calcNextAction()
  }

  calcNextAction () {
    const entry = this.list[this.index]

    if (!entry.actions) {
      return
    }

    const currentPosition = this.current.video.currentTime

    // filter
    const nextActions = entry.actions.filter((action, index) => action.time >= currentPosition && index >= this.current.actionIndex)
    if (nextActions.length) {
      const action = nextActions[0]
      this.current.actionIndex = entry.actions.indexOf(action) + 1

      if (action.time === currentPosition) {
        this.executeAction(entry, action)
      } else {
        window.setTimeout(() => {
          this.executeAction(entry, action)
        }, (action.time - currentPosition) * 1000)
      }
    }
  }

  end () {
    const entry = this.list[this.index]

    const nextActions = entry.actions.filter((action, index) => action.time == 'end')

    if (nextActions.length) {
      nextActions.forEach(action => this.executeAction(entry, action))
    } else {
      this.next()
    }
  }

  executeAction (entry, action) {
    this.emit('action', entry, action)

    if (action.title) {
      this.dom.appendChild(action.title)
      if (action.titleDuration) {
        window.setTimeout(() => this.dom.removeChild(action.title), action.titleDuration * 1000)
      }
    }

    if (action.pause) {
      this.current.video.pause()

      window.setTimeout(() => this.endAction(entry, action), action.pause * 1000)
    } else {
      this.endAction(entry, action)
    }
  }

  endAction (entry, action) {
    if (action.time === 'end') {
      this.next()
    } else {
      this.current.video.play()
      this.calcNextAction()
    }
  }

  next () {
    if (this.current) {
      this.current.index = null
      this.preloadList.push(this.current)
      this.current = null
    }

    this.preload()
    this.play()
  }
}

module.exports = PlaylistMedia
