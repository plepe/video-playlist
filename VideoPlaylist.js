const EventEmitter = require('events')
const async = {
  eachSeries: require('async/eachSeries')
}

/**
 * @typedef {Object} MediaItem - an entry in the playlist
 * @property {string} video href of video file
 * @property {number} videoDuration duration of the video in seconds (will be set/updated of the real duration, when the metadata has been loaded)
 * @property {Action[]} actions Actions which will be executed at certain positions in the video
 * @property {Pause[]} pauses At these positions, the video should pause and certain actions should happen (which will be reverted at the end of the pause).
 */

/**
 * @typedef {Object} Action - an action to be executed at a certain position in a video
 * @property {string|number} time timestamp (in seconds) when to execute the action in seconds or 'end'
 * @property {string|DOMNode} [title] HTML Text or a DOMNode which will be shown over the video. If it's a HTML text, it will be created as <div> with a class 'title'.
 * @property {number} [titleDuration] Duration (in seconds) for which this title is shown
 * @property {string|string[]} [classAdd] add the specified class(es) to the parent dom node
 * @property {string|string[]} [classRemove] remove the specified class(es) from the parent dom node
 */

/**
 * @typedef {Object} Pause - an action to be executed at a certain position in a video which will be reverted at the end of the pause
 * @property {string|number} time timestamp (in seconds) when to execute the action in seconds or 'end'
 * @property {string} duration (in seconds) after which the action(s) should be reverted.
 * @property {number} [pause] pause the video for the specified amount of seconds
 * @property {string|DOMNode} [title] HTML Text or a DOMNode which will be shown over the video. If it's a HTML text, it will be created as <div> with a class 'title'.
 * @property {string|string[]} [classAdd] add the specified class(es) to the parent dom node while the pause is active.
 * @property {string|string[]} [classRemove] remove the specified class(es) from the parent dom node while the pause is active.
 */

/*
 * @event VideoPlaylist#play Start playing a video.
 * @type {object} The entry from the video definition.
 */

/*
 * @event VideoPlaylist#loadedmetadata The metadata has been updated.
 * @type {object} The entry from the video definition.
 */

/*
 * @event VideoPlaylist#next The next video is about to start.
 * @type {object} The entry from the video definition.
 */

/*
 * @event VideoPlaylist#seeked
 * @type {object} The entry from the video definition.
 */

/*
 * @event VideoPlaylist#seeking
 * @type {object} The entry from the video definition.
 */

/*
 * @event VideoPlaylist#ended Ended playing a video.
 * @type {object} The entry from the video definition.
 */

/*
 * @event VideoPlaylist#action An action is being executed.
 * @type {object} The entry from the video definition.
 * @type {object} The current action.
 */

/*
 * @event videoplaylist#pause the video is being paused, for whatever reason (e.g.: planned pause, user interaction, js api, ...)
 * @type {object} the entry from the video definition.
 */

/*
 * @event videoplaylist#pauseStart a pause is started.
 * @type {object} the entry from the video definition.
 * @type {object} the current pause.
 */

/*
 * @event VideoPlaylist#pauseEnd A pause is ended.
 * @type {object} The entry from the video definition.
 * @type {object} The current pause.
 */

/*
 * @event VideoPlaylist#playing Playback is ready to start after having been paused or delayed due to lack of data.
 * @type {object} The entry from the video definition.
 */

/*
 * @event VideoPlaylist#endedAll Ended playing all videos.
 */

/**
 * VideoPlaylist - class that plays a list of media files consecutively
 * @property {number} index Current index of the played media file
 * @fires VideoPlaylist#play
 * @fires VideoPlaylist#loadedmetadata
 * @fires VideoPlaylist#seeked
 * @fires VideoPlaylist#seeking
 * @fires VideoPlaylist#ended
 * @fires VideoPlaylist#endedAll
 * @fires VideoPlaylist#action
 * @fires VideoPlaylist#pause
 * @fires VideoPlaylist#pauseStart
 * @fires VideoPlaylist#pauseEnd
 * @fires VideoPlaylist#playing
 */
class VideoPlaylist extends EventEmitter {
  /**
   * @param {DOMNode} dom Parent DOMNode where videos and titles will be shown
   * @param {MediaItem[]} list list of media items
   * @param {Object} options options
   * @param {boolean} [options.controls=false] Show controls on the video
   * @property {boolean} paused Is the video currently paused? If changed, pauses the current video.
   */
  constructor (dom, list, options) {
    super()
    this.list = list
    this.preloadIndex = 0
    this.options = options
    this.dom = dom
    this.actionTime = 0
    this.currentTimeout = null

    this.preloadList = []
    this.current = null

    this.preloadListInit()
    this.preload()
  }

  /**
   * remove everything
   */
  close () {
    if (this.current) {
      this.current.video.pause()
    }

    this.current = null
    this.preloadList = []
    this.list = []

    while (this.dom.firstChild) {
      this.dom.removeChild(this.dom.firstChild)
    }
  }

  preloadListInit () {
    for (let i = 0; i < 3; i++) {
      const entry = {
        index: null,
        video: document.createElement('video')
      }

      this.preloadList.push(entry)
    }

    this.preloadList.forEach((entry, i) => {
      entry.video.onended = () => this.end()
      entry.video.preload = 'auto'
      entry.video.controls = this.options.controls || false
      entry.video.onloadedmetadata = () => {
        if (!this.list.length) {
          return
        }

        if (entry.index === null) {
          return
        }

        this.list[entry.index].videoDuration = entry.video.duration
        this.emit('loadedmetadata', entry)

	if (this.requestedCurrentTime) {
	  this.currentTime = this.requestedCurrentTime
	}
      }
      entry.video.onseeked = () => {
        this.emit('seeked', entry)
        this.update()
      }
      entry.video.onseeking = () => {
        this.emit('seeking', entry)
        this.update()
      }
      entry.video.onplaying = () => {
        this.emit('playing', entry)
        this.update()
      }
      entry.video.onpause = () => {
        this.emit('pause', entry)
        this.update()
      }
      entry.video.onplay = () => {
        this.emit('play', entry)
        this.update()
      }
    })
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

      if (!entry.video) {
        entry.videoDuration = 0
      } else {
        preload.video.src = entry.video
      }
    })
  }

  /**
   * start - prepare the video for playing
   */
  start () {
    while (this.dom.firstChild) {
      this.dom.removeChild(this.dom.firstChild)
    }

    this.current = this.preloadList.shift()

    if (!this.current || this.current.index === null) {
      this.emit('endedAll')
      return
    }

    if (this.current.index > this.list.length) {
      return
    }

    const entry = this.list[this.current.index]

    if (entry.video) {
      this.dom.appendChild(this.current.video)
    }

    this.emit('next', entry)

    if (this.requestedCurrentTime) {
      this.currentTime = this.requestedCurrentTime
    } else {
      this.actionTime = 0
      this.current.actionIndex = 0
      this.current.pauseIndex = 0
      this.update()
    }
  }

  /**
   * play - start playing video
   */
  play () {
    if (!this.current) {
      this.start()
    }

    if (this.list[this.current.index].videoDuration === 0) {
      return this.next()
    }

    this.update()
  }

  /**
   * re-calculate duration, endtime and next action/pause
   */
  update () {
    if (this.currentTimeout) {
      window.clearTimeout(this.currentTimeout)
      this.currentTimeout = null
    }

    if (!this.current || this.current.index === null) {
      return
    }

    const entry = this.list[this.current.index]

    const currentPosition = this.current.video.currentTime

    // filter
    const nextActions = entry.actions ? entry.actions.filter((action, index) => action.time >= currentPosition && index >= this.current.actionIndex) : []
    const nextPauses = entry.pauses ? entry.pauses.filter((pause, index) => pause.time >= currentPosition && index >= this.current.pauseIndex) : []

    const time = Math.min(
      nextActions.length ? nextActions[0].time : global.Infinity, 
      nextPauses.length ? nextPauses[0].time : global.Infinity
    )

    if (time === currentPosition) {
      this.executeActionsOrPauses(entry, time)
    }
    else if (time !== global.Infinity) {
      this.currentTimeout = window.setTimeout(() => this.executeActionsOrPauses(entry, time), (time - currentPosition) * 1000)
    }
  }

  end () {
    if (!this.current) {
      return
    }

    const entry = this.list[this.current.index]

    this.executeActionsOrPauses(entry, 'end')
  }

  executeActionsOrPauses (entry, time, callback) {
    if (this.activePause) {
      // pause active, wait
      return
    }

    this.actionTime = time
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
      const pause = pauses.shift()

      this._pauseStart(entry, pause, callback)
    } else {
      this.activePause && this.activePause.end()

      if (time === 'end') {
        this.next()
      } else {
        this.current.video.play()
        this.update()
      }
    }
  }

  _pauseStart (entry, pause, duration=null) {
    this.current.video.pause()

    this.current.pauseIndex = entry.pauses.indexOf(pause) + 1

    this.activePause = {
      start: new Date().getTime() - (duration === null ? 0 : pause.duration - duration) * 1000,
      entry,
      pause
    }

    this.emit('pauseStart', entry, pause)

    let title
    if (pause.title) {
      title = this.showTitle(pause.title)
      this.activePause.title = title
    }

    this.classesModify(pause.classAdd, pause.classRemove)

    this.activePause.end = () => this._pauseEnd()

    this.activePause.timeout = window.setTimeout(
      () => this._pauseEnd(),
      (duration === null ? pause.duration : duration) * 1000
    )
  }

  _pauseEnd () {
    if (!this.activePause) {
      return
    }

    const entry = this.activePause.entry
    const pause = this.activePause.pause
    const title = this.activePause.title

    window.clearTimeout(this.activePause.timeout)

    this.emit('pauseEnd', entry, pause)

    if (title && title.parentNode === this.dom) {
      this.dom.removeChild(title)
    }

    this.classesModify(pause.classRemove, pause.classAdd)

    this.activePause = undefined

    this.executeActionsOrPauses(entry, pause.time)
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
    if (this.currentTimeout) {
      window.clearTimeout(this.currentTimeout)
      this.currentTimeout = null
    }

    if (this.current) {
      this.emit('ended')

      this.current.index = null
      this.preloadList.push(this.current)
      this.current = null
    }

    this.preload()
    this.start()
    if (this.current && this.current.index) {
      this.play()
    }
  }

  /**
   * return the duration of the video with index n in seconds (including pauses)
   * @param {number} index index of the video
   * @returns {?number} duration in seconds
   */
  durationIndex (index) {
    const entry = this.list[index]
    if (!entry) {
      return null
    }

    if (entry.videoDuration === undefined) {
      return null
    }

    const pauses = entry.pauses || []
    return parseFloat(entry.videoDuration) +
      pauses.reduce((total, pause) => total + parseFloat(pause.duration), 0)
  }

  /**
   * return the duration of the current video in seconds (including pauses)
   * @param {number} index index of the video
   * @return {?number} duration in seconds
   */
  get currentDuration () {
    return this.durationIndex(this.current.index)
  }

  /**
   * return the duration of the all videos in seconds (including pauses)
   * @return {number} duration in seconds
   */
  get duration () {
    return this.list
      .map((entry, index) => this.durationIndex(index))
      .filter(duration => duration)
      .reduce((total, duration) => total + duration, 0)
  }

  /**
   * return the position of the current video in seconds (including pauses)
   * @return {?number} duration in seconds
   */
  get currentCurrentTime () {
    const entry = this.list[this.current.index]
    if (!entry) {
      return null
    }

    const time = this.actionTime

    const pauses = entry.pauses ? entry.pauses.filter((pause, index) => (index < this.current.pauseIndex)) : []

    let result = this.current.video.currentTime

    if (this.activePause !== undefined) {
      const currentPause = pauses.pop()
      result += (new Date().getTime() - this.activePause.start) / 1000
    }
    
    result += pauses.reduce((total, pause) => total + parseFloat(pause.duration), 0)

    return result
  }

  /**
   * set the currentTime for the current video
   * @param {number} timestamp in seconds
   */
  set currentCurrentTime (time) {
    if (!this.current) {
      return
    }

    const entry = this.list[this.current.index]
    if (!entry) {
      return
    }

    if (this.activePause) {
      this._pauseEnd()
    }

    let pauses = []
    let videoTime = time
    if (entry.pauses) {
      pauses = entry.pauses.filter((pause, index) => {
        if (videoTime >= pause.time) {
          videoTime -= pause.duration
          return true
        }
      })

    }

    if (pauses.length) {
      const pause = pauses.pop()

      pauses.forEach(pause => time -= pause.duration)

      if (time < pause.time + pause.duration) {
        this.current.video.currentTime = pause.time
        this._pauseStart(entry, pause, time - pause.time)

        this.current.video.currentTime = pause.time
      } else {
        this.activePause && this.activePause.end()
        this.current.pauseIndex = entry.pauses.indexOf(pause) + 1

        this.current.video.currentTime = videoTime
        this.current.video.play()
      }
    }
  }

  /**
   * set the position of all videos in seconds (including pauses)
   * @param {number} timestamp in seconds
   */
  get currentTime () {
    if (!this.current) {
      return 0
    }

    const entry = this.list[this.current.index]
    if (!entry) {
      return null
    }

    let result = 0

    if (entry) {
      result += this.currentCurrentTime
    }

    result += this.list
      .filter((entry, index) => index < this.current.index)
      .reduce((total, entry, index) => total + this.durationIndex(index), 0)

    return result
  }

  /**
   * set the position of all videos in seconds (including pauses)
   * @param {number} timestamp in seconds
   */
  set currentTime (time) {
    let index
    let restTime = time
    this.requestedCurrentTime = null

    for (index = 0; index < this.list.length; index++) {
      const currentDuration = this.durationIndex(index)

      if (currentDuration === null) {
	this.requestedCurrentTime = restTime
	this.index = index
	return
      }

      if (restTime - currentDuration < 0) {
	break
      } else {
	restTime -= currentDuration
      }
    }

    if (this.current.index !== index) {
      this.index = index
    }

    this.currentCurrentTime = restTime
  }

  get paused () {
    return this.current.video.paused
  }

  /**
   * Pause the current video
   */
  pause () {
    if (this.current) {
      this.current.video.pause()
    }
  }

  /**
   * current index
   */
  get index () {
    return this.current.index
  }

  /**
   * start playing the entry in the playlist with index
   */
  set index (index) {
    // is this the current video? restart ...
    if (this.current && this.current.index === index) {
      this.currentCurrentTime = this.requestedCurrentTime
      this.update()
      return
    }

    // check if the index is already preloaded. clear other preloaded videos
    // and store for later
    const jump = []
    while (this.preloadList.length && this.preloadList[0].index !== index) {
      const entry = this.preloadList.shift()
      entry.index = null
      jump.push(entry)
    }

    // when we skipped all preloaders, tell preloader to load requested video
    if (!this.preloadList.length) {
      this.preloadIndex = index
    }

    // add skipped preloaders to the preloadList
    this.preloadList = this.preloadList.concat(jump)

    // jump to next video
    this.next()
  }
}

module.exports = VideoPlaylist
