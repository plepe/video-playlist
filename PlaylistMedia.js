const EventEmitter = require('events')
const async = {
  eachSeries: require('async/eachSeries')
}

/**
 * @typedef {Object} MediaItem - an entry in the playlist
 * @property {string} video href of video file
 * @property {string} audio href of audio file
 * @property {number} videoDuration duration of the video in seconds (will be set/updated of the real duration, when the metadata has been loaded)
 * @property {number} audioDuration duration of the audio in seconds (will be set/updated of the real duration, when the metadata has been loaded)
 * @property {Action[]} actions Actions which will be executed at certain positions in the video/audio
 * @property {Pause[]} pauses At these positions, the video should pause and certain actions should happen (which will be reverted at the end of the pause).
 */

/**
 * @typedef {Object} Action - an action to be executed at a certain position in a video/audio
 * @property {string|number} time timestamp (in seconds) when to execute the action in seconds or 'end'
 * @property {string|DOMNode} [title] HTML Text or a DOMNode which will be shown over the video. If it's a HTML text, it will be created as <div> with a class 'title'.
 * @property {number} [titleDuration] Duration (in seconds) for which this title is shown
 * @property {string|string[]} [classAdd] add the specified class(es) to the parent dom node
 * @property {string|string[]} [classRemove] remove the specified class(es) from the parent dom node
 */

/**
 * @typedef {Object} Pause - an action to be executed at a certain position in a video/audio which will be reverted at the end of the pause
 * @property {string|number} time timestamp (in seconds) when to execute the action in seconds or 'end'
 * @property {string} duration (in seconds) after which the action(s) should be reverted.
 * @property {number} [pause] pause the video for the specified amount of seconds
 * @property {string|DOMNode} [title] HTML Text or a DOMNode which will be shown over the video. If it's a HTML text, it will be created as <div> with a class 'title'.
 * @property {string|string[]} [classAdd] add the specified class(es) to the parent dom node while the pause is active.
 * @property {string|string[]} [classRemove] remove the specified class(es) from the parent dom node while the pause is active.
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
      entry.video.onseeked = () => this.calcNextActionOrPause()
      entry.video.onseeking = () => this.calcNextActionOrPause()
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
    this.current.pauseIndex = 0
    this.calcNextActionOrPause()
  }

  calcNextActionOrPause () {
    const entry = this.list[this.index]

    const currentPosition = this.current.video.currentTime

    // filter
    const nextActions = entry.actions ? entry.actions.filter((action, index) => action.time >= currentPosition && index >= this.current.actionIndex) : []
    const nextPauses = entry.pauses ? entry.pauses.filter((pause, index) => pause.time >= currentPosition && index >= this.current.pauseIndex) : []

    const time = Math.min(
      nextActions.length ? nextActions[0].time : global.Infinity, 
      nextPauses.length ? nextPauses[0].time : global.Infinity
    )

    if (time === currentPosition) {
      this.executeActionsOrPauses(entry, time, () => this.calcNextActionOrPause())
    }
    else if (time !== global.Infinity) {
      window.setTimeout(() => this.executeActionsOrPauses(entry, time, () => this.calcNextActionOrPause()), (time - currentPosition) * 1000)
    }
  }

  end () {
    const entry = this.list[this.index]

    this.executeActionsOrPauses(entry, 'end', () => this.next())
  }

  executeActionsOrPauses (entry, time, callback) {
    const actions = entry.actions ? entry.actions.filter((action, index) => action.time === time && index >= this.current.actionIndex) : []
    const pauses = entry.pauses ? entry.pauses.filter((pause, index) => pause.time === time && index >= this.current.pauseIndex) : []

    actions.forEach(action => {
      this.current.actionIndex = entry.actions.indexOf(action) + 1

      this.emit('action', entry, action)

      if (action.title) {
        const title = this.showTitle(action.title)
        if (action.titleDuration) {
          window.setTimeout(() => this.dom.removeChild(title), action.titleDuration * 1000)
        }
      }

      this.classesModify(action.classAdd, action.classRemove)
    })

    if (pauses.length) {
      this.current.video.pause()
    } else {
      return callback()
    }

    async.eachSeries(pauses,
      (pause, done) => {
        this.current.pauseIndex = entry.pauses.indexOf(pause) + 1

        this.emit('pauseStart', entry, pause)

        let title
        if (pause.title) {
          title = this.showTitle(pause.title)
        }

        this.classesModify(pause.classAdd, pause.classRemove)

        window.setTimeout(() => {
          if (title) {
            this.dom.removeChild(title)
          }

          this.classesModify(pause.classRemove, pause.classAdd)

          this.emit('pauseEnd', entry, pause)

          done()
        }, pause.duration * 1000)
      },
      () => {
        if (time !== 'end') {
          this.current.video.play()
        }

        callback()
      }
    )
  }

  showTitle (title) {
    let result = title
    if (typeof title === 'string') {
      result = document.createElement('div')
      result.className = 'title'
      result.innerHTML = title
    }

    this.dom.appendChild(result)
    return result
  }

  classesModify (add, remove) {
    if (add) {
      if (Array.isArray(add)) {
        this.dom.classList.add.apply(null, add)
      } else {
        this.dom.classList.add(add)
      }
    }

    if (remove) {
      if (Array.isArray(remove)) {
        this.dom.classList.remove.apply(null, remove)
      } else {
        this.dom.classList.remove(remove)
      }
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
