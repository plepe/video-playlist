/**
 * MediaItem
 * video: href of video file
 * audio: href of audio file
 */

/**
 * PlaylistMedia - class that plays a list of media files consecutively
 */
class PlaylistMedia {
  /**
   * list list of media items
   * options options
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

    this.videos = [document.createElement('video')]
    this.videos.forEach(video => {
    })
    this.audios = [new Audio()]
    this.audios.forEach(video => {
      video.onended = () => this.next()
    })
  }

  preloadListInit () {
    for (let i = 0; i < 1; i++) {
      const entry = {
        index: null,
        video: document.createElement('video'),
        audio: new Audio()
      }

      entry.video.onended = () => this.next()
      entry.audio.onended = () => this.next()
      entry.video.controls = true

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
    while(this.dom.firstChild) {
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
