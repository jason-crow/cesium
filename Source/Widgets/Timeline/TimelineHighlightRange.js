define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/JulianDate',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defined,
        JulianDate,
        knockout) {
    'use strict';

    /**
     * @private
     */
    function TimelineHighlightRange(color, heightInPx, base, cssClass) 
        {
        this._color = color;
        this._height = heightInPx;
        this._base = defaultValue(base, 0);
        this._class = Cesium.defaultValue(cssClass, 'cesium-timeline-highlight');
        this._isRevision = false;
        this._element = undefined;
        this.active = false;
        knockout.track(this, ['active']);
        }

    TimelineHighlightRange.prototype.makeRevision = function(revision, change) {
        this._isRevision = true;
        this._revision = revision;
        this._id = revision.id;
        this._change = change;
        this._block = false;
        this._active = true;
        this._previewMarker = 
            { 
            active: false,
            title: this._revision.name,
            isHover: false,
            click: () => 
                {
                // TODO: just use the revision item in the list tool as the model to bind with the marker template
                // instead of setting this tempSwitch to mimic that behavior
                this._previewMarker.active = true;
                this._change.raiseEvent([this._revision], false, true);
                }
            }
        this.setRange(revision.timeData.start, revision.timeData.stop);
        knockout.track(this._previewMarker, ['active','isHover']);
        this.disposer = this._change.addEventListener((revisions, showState, tempSwitch) =>
            {
            if(!tempSwitch && !showState)
                {
                this._previewMarker.active = Cesium.defined(revisions.find((r) => r.id === this._revision.id));
                } 
            });
    };

    TimelineHighlightRange.prototype.getHeight = function() {
        return this._height;
    };

    TimelineHighlightRange.prototype.getBase = function() {
        return this._base;
    };

    TimelineHighlightRange.prototype.getStartTime = function() {
        return this._start;
    };

    TimelineHighlightRange.prototype.getStopTime = function() {
        return this._stop;
    };

    TimelineHighlightRange.prototype.setRange = function(start, stop) {
        this._start = start;
        this._stop = stop;
    };

    TimelineHighlightRange.prototype.clearRevision = function(start, stop) {
        if(defined(this.disposer)) this.disposer();
        if(defined(this._element)) 
            {         
            this._element.parentNode.removeChild(this._element);
            knockout.removeNode(this._element);
            this._element = undefined;
            }
        if(defined(this._previewMarkerTemplate)) 
            {      
            this._previewMarkerTemplate.parentNode.removeChild(this._previewMarkerTemplate);
            knockout.removeNode(this._previewMarkerTemplate);
            this._previewMarkerTemplate = undefined;
            }
    };

    TimelineHighlightRange.prototype.render = function(renderState) {
        var range = document.createElement('div');
        if(defined(this._element)) 
            {         
            this._element.parentNode.removeChild(this._element);
            knockout.removeNode(this._element);
            this._element = undefined;
            }
        if(defined(this._previewMarkerTemplate)) 
            {      
            this._previewMarkerTemplate.parentNode.removeChild(this._previewMarkerTemplate);
            knockout.removeNode(this._previewMarkerTemplate);
            this._previewMarkerTemplate = undefined;
            }
        if (this._start && this._stop && this._color) {
            var highlightStart = JulianDate.secondsDifference(this._start, renderState.epochJulian);
            var highlightLeft = Math.round(renderState.timeBarWidth * renderState.getAlpha(highlightStart));
            var highlightStop = JulianDate.secondsDifference(this._stop, renderState.epochJulian);
            var highlightWidth = Math.round(renderState.timeBarWidth * renderState.getAlpha(highlightStop)) - highlightLeft;
            if (highlightLeft < 0) {
                highlightWidth += highlightLeft;
                highlightLeft = 0;
            }
            if ((highlightLeft + highlightWidth) > renderState.timeBarWidth) {
                highlightWidth = renderState.timeBarWidth - highlightLeft;
            }
            if (highlightWidth > 0) {
                range.className = this._class;
                range.style.width = highlightWidth.toString() + 'px';
                range.style.height = this._height.toString() + 'px';
                range.style.bottom = this._base.toString() + + 'px';
                range.style.left =  highlightLeft.toString() + 'px';
                if(this._id !== -1)
                    {
                    var hoverTitle = document.createElement('div');
                    hoverTitle.className = 'bim-preview-title';
                    hoverTitle.setAttribute('data-bind',"visible: isHover");  
                    hoverTitle.innerText = this._revision.label;

                
                    var previewMarker = document.createElement('div');
                    previewMarker.className = 'bim-revision-preview-marker';
                    previewMarker.appendChild(hoverTitle);
                    //previewMarker.setAttribute('title', this._previewMarker.title);
                    previewMarker.setAttribute('data-bind',"css:{'bim-active': active }"); 
                    previewMarker.style.left =  highlightLeft.toString() + 'px';
                    previewMarker.onmouseover = () => 
                        {
                        this._previewMarker.isHover = true;
                        }
                    previewMarker.onmouseleave = () => 
                        {
                        this._previewMarker.isHover = false;
                        }
                    previewMarker.onclick = () =>
                        {
                        //renderState.deactivateRevisions.raiseEvent();
                        this._previewMarker.click();       
                        } 
                    
                    renderState.topDiv.insertBefore(previewMarker, renderState.topDiv.firstChild);
                    this._previewMarkerTemplate = previewMarker;
                    knockout.applyBindings(this._previewMarker, previewMarker);
                    }
            }
        }
        return range;
    };

    return TimelineHighlightRange;
});
