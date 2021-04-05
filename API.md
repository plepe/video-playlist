## Classes

<dl>
<dt><a href="#VideoPlaylist">VideoPlaylist</a></dt>
<dd><p>VideoPlaylist - class that plays a list of media files consecutively</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#MediaItem">MediaItem</a> : <code>Object</code></dt>
<dd><p>an entry in the playlist</p>
</dd>
<dt><a href="#Action">Action</a> : <code>Object</code></dt>
<dd><p>an action to be executed at a certain position in a video</p>
</dd>
<dt><a href="#Pause">Pause</a> : <code>Object</code></dt>
<dd><p>an action to be executed at a certain position in a video which will be reverted at the end of the pause</p>
</dd>
</dl>

<a name="VideoPlaylist"></a>

## VideoPlaylist
VideoPlaylist - class that plays a list of media files consecutively

**Kind**: global class  
**Emits**: <code>VideoPlaylist#event:play</code>, <code>VideoPlaylist#event:loadedmetadata</code>, <code>VideoPlaylist#event:ended</code>, <code>VideoPlaylist#event:endedAll</code>, <code>VideoPlaylist#event:action</code>, <code>VideoPlaylist#event:pauseStart</code>, <code>VideoPlaylist#event:pauseEnd</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | Current index of the played media file |


* [VideoPlaylist](#VideoPlaylist)
    * [new VideoPlaylist(list, options)](#new_VideoPlaylist_new)
    * [.currentDuration](#VideoPlaylist+currentDuration) ⇒ <code>number</code>
    * [.duration](#VideoPlaylist+duration) ⇒ <code>number</code>
    * [.currentCurrentTime](#VideoPlaylist+currentCurrentTime) ⇒ <code>number</code>
    * [.currentTime](#VideoPlaylist+currentTime) ⇒ <code>number</code>
    * [.play()](#VideoPlaylist+play)
    * [.durationIndex(index)](#VideoPlaylist+durationIndex) ⇒ <code>number</code>

<a name="new_VideoPlaylist_new"></a>

### new VideoPlaylist(list, options)

| Param | Type | Description |
| --- | --- | --- |
| list | [<code>Array.&lt;MediaItem&gt;</code>](#MediaItem) | list of media items |
| options | <code>Object</code> | options |

<a name="VideoPlaylist+currentDuration"></a>

### videoPlaylist.currentDuration ⇒ <code>number</code>
return the duration of the current video in seconds (including pauses)

**Kind**: instance property of [<code>VideoPlaylist</code>](#VideoPlaylist)  
**Returns**: <code>number</code> - duration in seconds  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | index of the video |

<a name="VideoPlaylist+duration"></a>

### videoPlaylist.duration ⇒ <code>number</code>
return the duration of the all videos in seconds (including pauses)

**Kind**: instance property of [<code>VideoPlaylist</code>](#VideoPlaylist)  
**Returns**: <code>number</code> - duration in seconds  
<a name="VideoPlaylist+currentCurrentTime"></a>

### videoPlaylist.currentCurrentTime ⇒ <code>number</code>
return the position of the current video in seconds (including pauses)

**Kind**: instance property of [<code>VideoPlaylist</code>](#VideoPlaylist)  
**Returns**: <code>number</code> - duration in seconds  
<a name="VideoPlaylist+currentTime"></a>

### videoPlaylist.currentTime ⇒ <code>number</code>
return the position of all videos in seconds (including pauses)

**Kind**: instance property of [<code>VideoPlaylist</code>](#VideoPlaylist)  
**Returns**: <code>number</code> - duration in seconds  
<a name="VideoPlaylist+play"></a>

### videoPlaylist.play()
play - start playing playlist

**Kind**: instance method of [<code>VideoPlaylist</code>](#VideoPlaylist)  
<a name="VideoPlaylist+durationIndex"></a>

### videoPlaylist.durationIndex(index) ⇒ <code>number</code>
return the duration of the video with index n in seconds (including pauses)

**Kind**: instance method of [<code>VideoPlaylist</code>](#VideoPlaylist)  
**Returns**: <code>number</code> - duration in seconds  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | index of the video |

<a name="MediaItem"></a>

## MediaItem : <code>Object</code>
an entry in the playlist

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| video | <code>string</code> | href of video file |
| videoDuration | <code>number</code> | duration of the video in seconds (will be set/updated of the real duration, when the metadata has been loaded) |
| actions | [<code>Array.&lt;Action&gt;</code>](#Action) | Actions which will be executed at certain positions in the video |
| pauses | [<code>Array.&lt;Pause&gt;</code>](#Pause) | At these positions, the video should pause and certain actions should happen (which will be reverted at the end of the pause). |

<a name="Action"></a>

## Action : <code>Object</code>
an action to be executed at a certain position in a video

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| time | <code>string</code> \| <code>number</code> | timestamp (in seconds) when to execute the action in seconds or 'end' |
| [title] | <code>string</code> \| <code>DOMNode</code> | HTML Text or a DOMNode which will be shown over the video. If it's a HTML text, it will be created as <div> with a class 'title'. |
| [titleDuration] | <code>number</code> | Duration (in seconds) for which this title is shown |
| [classAdd] | <code>string</code> \| <code>Array.&lt;string&gt;</code> | add the specified class(es) to the parent dom node |
| [classRemove] | <code>string</code> \| <code>Array.&lt;string&gt;</code> | remove the specified class(es) from the parent dom node |

<a name="Pause"></a>

## Pause : <code>Object</code>
an action to be executed at a certain position in a video which will be reverted at the end of the pause

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| time | <code>string</code> \| <code>number</code> | timestamp (in seconds) when to execute the action in seconds or 'end' |
| duration | <code>string</code> | (in seconds) after which the action(s) should be reverted. |
| [pause] | <code>number</code> | pause the video for the specified amount of seconds |
| [title] | <code>string</code> \| <code>DOMNode</code> | HTML Text or a DOMNode which will be shown over the video. If it's a HTML text, it will be created as <div> with a class 'title'. |
| [classAdd] | <code>string</code> \| <code>Array.&lt;string&gt;</code> | add the specified class(es) to the parent dom node while the pause is active. |
| [classRemove] | <code>string</code> \| <code>Array.&lt;string&gt;</code> | remove the specified class(es) from the parent dom node while the pause is active. |

