class MetricQWebView {
  constructor(paramParentEle, paramMetricNamesArr, paramStartTime, paramStopTime)
  {
  	this.id = "metricqwebview_" + (new Date()).getTime();
    if(!window["MetricQWebView"])
    {
      window.MetricQWebView = {
      	instances: new Array()
      };
    }
    window.MetricQWebView.instances.push(this);

    this.ele = paramParentEle;
    this.handler = new MetricHandler(this, paramMetricNamesArr, paramStartTime, paramStopTime);
    this.postRender = undefined;
    this.countTraces = 0;
    this.hasPlot = false;
    this.graticule = undefined;
    this.configuration = new Configuration(2, 4)
    /* TODO: old globals
    var globalYRangeOverride = undefined;
    var globalYRangeType = 'local';
    */
    this.yRangeOverride = undefined;
    this.yRangeType = 'local';

      // accelerate zooming with scroll wheel
    this.ele.addEventListener("wheel", function (configParam) { return function (evt) {
      evt.stopPropagation();
      var dataObj = {
        time: (new Date()).getTime(),
        clientX: evt.clientX,
        clientY: evt.clientY,
        deltaY: evt.deltaY * configParam.zoomSpeed
      }
      var newEvent = new WheelEvent("wheel", dataObj );
      configParam.lastWheelEvent = dataObj;
      evt.target.dispatchEvent(newEvent);
    };}(this.configuration));
    // see the source file
    //   src/plots/cartesian/layout_attributes.js
    // for a complete set of available options
    this.plotlyLayout = {
	  xaxis: {
	    type: 'date',
	    showticklabels: true,
	    ticks: "outside",
	    tickangle: 'auto',
	    tickfont: {
	      family: 'Open Sans, Sans, Verdana',
	      size: 14,
	      color: 'black'
	    },
        showgrid: false,
	    exponentformat: 'e',
	    showexponent: 'all'
	  },
	  yaxis: {
	    showticklabels: true,
	    tickangle: 'auto',
	    tickmode: "last",
	    tickfont: {
	      family: 'Open Sans, Sans, Verdana',
	      size: 14,
	      color: 'black'
	    },
	    exponentformat: 'e',
	    showexponent: 'all',
	    fixedrange: true // disable y-zooming
	  },
	  showlegend: false,
	  dragmode: "pan"
	};
    this.plotlyOptions = {
	  scrollZoom: true,
	  // see src/components/modebar/buttons.js
	  // on how to modify hover behaviour:
	  // 173 modeBarButtons.hoverClosestCartesian
	  // "zoom2d", "zoomIn2d", "zoomOut2d"
	  modeBarButtonsToRemove: [ "lasso2d", "autoScale2d", "resetScale2d", "select2d", "toggleHover", "toggleSpikelines", "hoverClosestCartesian", "hoverCompareCartesian", "toImage"],
	  displaylogo: false, // don't show the plotly logo
	  toImageButtonOptions: {
	    format: "svg", // also available: jpeg, png, webp
	    filename: "metricq-webview",
	    height: 500,
	    width: 800,
	    scale: 1
	  },
	  responsive: true, // automatically adjust to window resize
	  displayModeBar: true // icons always visible
	}
	//Plotly.d3.behavior.zoom.scaleBy = function(selection, k) { return k*100; };
    if(0 < paramMetricNamesArr.length)
    {
      this.handler.doRequest(400);
    }
  }
  reinitialize(metricsArr, startTime, stopTime)
  {
    this.handler.initializeMetrics(metricsArr);
    this.handler.startTime = startTime;
    this.handler.stopTime = stopTime;
    this.handler.doRequest(400);
  }
  renderMetrics(datapointsJSON)
  {
    let allTraces = new Array();

    for(var metricBase in this.handler.allMetrics)
    {
      let curMetric = this.handler.allMetrics[metricBase];
      if(curMetric.traces) {
        allTraces = allTraces.concat(curMetric.traces);
      }
    }

    this.updateMetricUrl();
    //console.log("Render " + Math.round((globalEnd - globalStart)/1000) + " seconds delta");

    if(!this.hasPlot)
    {
    	//TODO: initialize Graticule class here
    	var canvasSize = [ parseInt(this.ele.offsetWidth), 400];
    	var canvasBorders = [10, 20, 40, 40]; //TOP, RIGHT, BOTTOM, LEFT;
    	var labelingDistance = [5, 10]; // first left, then bottom
    	var myCanvas = document.createElement("canvas");
    	myCanvas.setAttribute("width", canvasSize[0]);
    	myCanvas.setAttribute("height", canvasSize[1]);
    	this.ele.appendChild(myCanvas);
    	var myContext = myCanvas.getContext("2d");
    	// Params: (ctx, offsetDimension, paramPixelsLeft, paramPixelsBottom, paramClearSize)
    	this.graticule = new Graticule(myContext, [canvasBorders[3],
    											  canvasBorders[0],
    											  canvasSize[0] - (canvasBorders[1] + canvasBorders[3]),
    											  canvasSize[1] - (canvasBorders[0] + canvasBorders[2])],
    									labelingDistance[0], labelingDistance[1],
    									[canvasSize[0], canvasSize[1]]);
    	this.hasPlot = true;
    	this.graticule.data.processMetricQDatapoints(datapointsJSON, true, true);
    	this.graticule.draw(true);

	    /* TODO: externalize gear stuff */
	  var gearEle = document.getElementById("gear_xaxis");
	  if(gearEle)
	  {
	    gearEle.parentNode.removeChild(gearEle);
	    gearEle = document.getElementById("gear_yaxis");
	    gearEle.parentNode.removeChild(gearEle);
	  }
	  const BODY = document.getElementsByTagName("body")[0];
	  /* TODO: abstract gear creation into separate class */
	  var gearImages = [undefined, undefined, undefined, undefined];
	  var gearSrc = ["img/icons/gear.svg",
	  			     "img/icons/arrow-left-right.svg",
	  			     "img/icons/gear.svg",
	  			     "img/icons/arrow-up-down.svg"];
	  for(var i = 0; i < 4; ++i)
	  {
	    gearImages[i] = document.createElement("img");
	    var img = new Image();
	    img.src = gearSrc[i];
	    gearImages[i].src = img.src;
	    if(-1 < gearSrc[i].indexOf("gear"))
	    {
	      gearImages[i].setAttribute("class", "gear_axis");
	    }
	    gearImages[i].setAttribute("width", "28");
	    gearImages[i].setAttribute("height", "28");
	  }
	  var gearWrapper = [undefined, undefined];
	  var gearIds = ["gear_xaxis", "gear_yaxis"];
	  for(var i = 0; i < 2; ++i)
	  {
	    gearWrapper[i] = document.createElement("div");
	    gearWrapper[i].setAttribute("id", gearIds[i]);
	    gearWrapper[i].appendChild(gearImages[i * 2]);
	    gearWrapper[i].appendChild(document.createElement("br"));
	    gearWrapper[i].appendChild(gearImages[i * 2 + 1]);
	    gearWrapper[i] = BODY.appendChild(gearWrapper[i]);
	  }
	  this.positionXAxisGear(this.ele, gearWrapper[0]);
	  gearWrapper[0].addEventListener("click", function() {
	    globalPopup.xaxis = ! globalPopup.xaxis;
	  });
	  this.positionYAxisGear(this.ele, gearWrapper[1]);
	  gearWrapper[1].addEventListener("click", function() {
	    globalPopup.yaxis = ! globalPopup.yaxis;
	  });

    } else
    {
      // don't rerender everything
      //TODO: update Graticule here
    }

    if(this.postRender)
    {
    	this.postRender();
    }
  }
	positionXAxisGear(rowBodyEle, gearEle) {
	  gearEle.style.position = "absolute";
	  var posGear = this.getTopLeft(rowBodyEle);
	  posGear[0] += parseInt(rowBodyEle.offsetWidth) - parseInt(gearEle.offsetWidth);
	  posGear[1] += parseInt(rowBodyEle.offsetHeight) - parseInt(gearEle.offsetHeight);
	  posGear[0] += -35;
	  posGear[1] += -30;
	  gearEle.style.left = posGear[0] + "px";
	  gearEle.style.top = posGear[1] + "px";  
	}
	positionYAxisGear(rowBodyEle, gearEle) {
	  gearEle.style.position = "absolute";
	  var posGear = this.getTopLeft(rowBodyEle);
	  posGear[0] += 20;
	  posGear[1] += 70;
	  gearEle.style.left = posGear[0] + "px";
	  gearEle.style.top = posGear[1] + "px";    
	}
	getTopLeft(ele) {
	  var topLeft = [0, 0];
	  let eleRect = ele.getBoundingClientRect();
	  topLeft[0] = eleRect.left + window.scrollX;
	  topLeft[1] = eleRect.top + window.scrollY;
	  return topLeft;
	}
	updateMetricUrl()
	{
	  let encodedStr = "";
	  //old style: 
	  if(false)
	  {
	    let jsurlObj = {
	      "cntr": new Array(),
	      "start": this.handler.startTime,
	      "stop": this.handler.stopTime,
	    };
	    for(var metricBase in this.handler.allMetrics)
	    {
	      jsurlObj.cntr.push(this.handler.allMetrics[metricBase].name);
	    }
	    encodedStr = encodeURIComponent(window.JSURL.stringify(jsurlObj));
	  } else
	  {
	    encodedStr = "." + this.handler.startTime + "_" + this.handler.stopTime;
	    for(var metricBase in this.handler.allMetrics)
	    {
	      encodedStr += "_" + this.handler.allMetrics[metricBase].name;
	    }
	    encodedStr = encodeURIComponent(encodedStr);
	  }
	  window.location.href =
	     parseLocationHref()[0]
	   + "#"
	   + encodedStr;
	}
	setPlotRanges(updateXAxis, updateYAxis)
	{
	  if(!updateXAxis && !updateYAxis)
	  {
	    return;
	  }
	  //TODO: code me
	}
	reload()
	{
		this.handler.reload();
	}
	getMetric(metricName)
	{
		for(var metricBase in this.handler.allMetrics)
		{
			if(this.handler.allMetrics[metricBase].name == metricName)
			{
				return this.handler.allMetrics[metricBase];
			}
		}
		return undefined;
	}
	newEmptyMetric()
	{
		if(!this.handler.allMetrics["empty"])
		{
			this.handler.allMetrics["empty"] = new Metric("", metricBaseToRgb(""), markerSymbols[0], new Array());
		}
	}
	deleteMetric(metricBase)
	{
		delete this.handler.allMetrics[metricBase];
	}
	deleteTraces(tracesArr)
	{
		Plotly.deleteTraces(this.ele, tracesArr);
		this.countTraces -= tracesArr.length;
	}
	changeMetricName(metricReference, newName, oldName)
	{
		metricReference.updateName(newName);
        if("" == oldName)
        {
            this.handler.allMetrics["empty"] = new Metric("", metricBaseToRgb(""), markerSymbols[0], new Array());
            this.handler.allMetrics[newName] = metricReference;
        } else
        {
        	delete this.handler.allMetrics[oldName];
        	this.handler.allMetrics[newName] = metricReference;
        }
        /* TODO: reject metric names that already exist */
        this.reload();
	}
	doExport()
	{
		//this.plotlyLayout.showlegend=true;
		Plotly.relayout(this.ele,{"showlegend": true});
		Plotly.downloadImage(this.ele, this.plotlyOptions.toImageButtonOptions);
		Plotly.relayout(this.ele,{"showlegend": false});
	}
}

function parseLocationHref()
{
	let hashPos = window.location.href.indexOf("#");
	let baseUrl = "";
	let jsurlStr = "";
	if(-1 == hashPos)
	{
		baseUrl = window.location.href;
	} else
	{
		baseUrl = window.location.href.substring(0, hashPos);
		jsurlStr = decodeURIComponent(window.location.href.substring(hashPos + 1));
	}
	return [baseUrl, jsurlStr];
}

function importMetricUrl()
{
  var jsurlStr = parseLocationHref()[1];
  if(1 < jsurlStr.length)
  {
    if("~" == jsurlStr.charAt(0))
    {
      let metricsObj = undefined;
      try {
        metricsObj = window.JSURL.parse(jsurlStr);
      } catch(exc)
      {
        console.log("Could not interpret URL");
        console.log(exc);
        return false;
      }
      initializeMetrics(metricsObj.cntr, parseInt(metricsObj.start), parseInt(metricsObj.stop));
      return true;
    } else if("." == jsurlStr.charAt(0))
    {
      const splitted = jsurlStr.split("_");
      if(1 < splitted.length)
      {
        initializeMetrics(splitted.slice(2), parseInt(splitted[0].substring(1)), parseInt(splitted[1]));
        return true;
      }
    }
  }
  return false;
}
/* TODO: generalize this for cases where is no "legendApp" */
function initializeMetrics(metricNamesArr, timeStart, timeStop)
{
  let newManager = undefined;
  if(window.MetricQWebView)
  {
    newManager = window.MetricQWebView.instances[0];
    newManager.reinitialize(metricNamesArr, timeStart, timeStop);
    newManager.postRender = function() {
      legendApp.$forceUpdate();
    };
  } else 
  {
    newManager = new MetricQWebView(document.querySelector(".row_body"), metricNamesArr, timeStart, timeStop);
    newManager.postRender = function() {
      legendApp.$forceUpdate();
    };
  }
}