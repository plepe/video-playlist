/**
 * @typedef {Object} MediaItem - an entry in the playlist
 * @property {string} video href of video file
 * @property {string} audio href of audio file
 * @property {number} videoDuration duration of the video in seconds (will be set/updated of the real duration, when the metadata has been loaded)
 * @property {number} audioDuration duration of the audio in seconds (will be set/updated of the real duration, when the metadata has been loaded)
 */

/**
 * PlaylistMedia - class that plays a list of media files consecutively
 */
class PlaylistMedia {
  /**
   * @param {MediaItem[]} list list of media items
   * @param {Object} options options
   */
  constructor (list, options) {
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

      entry.video.onended = () => this.next()
      entry.video.preload = 'auto'
      entry.video.controls = true
      entry.video.onloadedmetadata = () => {
        this.list[entry.index].videoDuration = entry.video.duration
      }
      entry.audio.onended = () => this.next()
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

if (typeof module !== 'undefined' && module) {
  module.exports = PlaylistMedia
}
