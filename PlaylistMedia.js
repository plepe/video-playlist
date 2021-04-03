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
    this.index = 0
    this.options = options
    this.dom = this.options.dom
    this.videos = [document.createElement('video')]
    this.videos.forEach(video => {
      video.onended = () => this.next()
    })
    this.audios = [new Audio()]
    this.audios.forEach(video => {
      video.onended = () => this.next()
    })
  }

  /**
   * play - start playing playlist
   */
  play () {
    while(this.dom.firstChild) {
      this.dom.removeChild(this.dom.firstChild)
    }

    const entry = this.list[this.index]
    if (entry.video) {
      this.options.dom.appendChild(this.videos[0])
      this.videos[0].src = entry.video
      this.videos[0].play()
    }
    if (entry.audio) {
      this.audios[0].src = entry.audio
      this.audios[0].play()
    }
  }

  next () {
    this.index++
    if (this.index < this.list.length) {
      this.play()
    }
  }
}
