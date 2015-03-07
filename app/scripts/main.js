//Made by @b10nik

//Linter preferences
/*global $, moment, Chart*/
/*jslint node: true*/

var config = {
  debug: true,
  temperatureLabels: ['0h', '', '', '', '1h', '', '', '', '2h', '', '', '', '3h']
};

function log(obj){
  'use strict';
  if(config.debug && typeof console.log !== 'undefined') {
    console.log(obj);
  }
}

var App = function(container){
  'use strict';
  var a = this;

  //Variables
  a.second = 0;
  a.minute = 0;

  //Dom stuff
  a.container = container;
  a.timeContainer = $(container).find('.datetime .time');
  a.dateContainer = $(container).find('.datetime .date');

  a.refreshSize = function(){
    log('refreshSize');
    a.temperatureGraph.update();

    var ircHeight = $(window).height()-$('.content.irc').offset().top-40;
    $('.content.irc').css({'height': ircHeight+'px'});

  };

  //Tick seconds
  a.tick = function(){
    a.second++;
    a.updateSecond();

    if(a.second >= 60){
      //Minute is full.
      a.second = 0;
      a.minute++;
      a.updateMinute();

      if(a.minute >= 15){
        //15 minutes is full.
        a.minute = 0;
        a.update15Minutes();
      }
    }
  };

  a.addTemperature = function(reading){
    log('addTemperature');
    if (a.temperatureGraph.datasets[0].points.length > 12) {
      a.temperatureGraph.removeData();
    }

    a.temperatureGraph.addData([reading], '');

    var labels = [];
    for(var i=0; i<a.temperatureGraph.datasets[0].points.length; i++){
      var label = config.temperatureLabels[( a.temperatureGraph.datasets[0].points.length - i)-1];
      labels.push(label);
    }

    a.temperatureGraph.scale.xLabels = labels;
    a.temperatureGraph.update();

  };

  a.updateLights = function(room1, room2){
    log('updateLights');
    $('#room1','#room2').attr('class', '');
    if(room1){
      $('#room1').html('on').addClass('on');
    } else {
      $('#room1').html('off').addClass('off');
    }
    if(room2){
      $('#room2').html('on').addClass('on');
    } else {
      $('#room2').html('off').addClass('off');
    }
  };

  //Update every second
  a.updateSecond = function(){
    log('updateSecond');
    $(a.timeContainer).html(moment().format('HH:mm'));
  };

  a.updateMinute = function(){
    log('updateMinute');
    $(a.dateContainer).html(moment().format('dddd, MMMM Do').toLowerCase());

    a.updateLights(true, false);
  };

  a.update15Minutes = function(){
    log('update15Minutes');
    //Get temperature and update it in the graph.
    a.addTemperature( Math.floor(Math.random()*40-20) );
  };

  a.init = function(){
    log('init');
    var color = '254,254,254';

    Chart.defaults.global.scaleFontColor = 'rgba(251,251,251,1)';
    Chart.defaults.global.animationSteps = 30;

    var firstTemperature = 17;

    var data = {
      labels: ['',''],
      datasets: [
        {
          label: 'Temperature',
          fillColor: 'rgba('+color+',0.1)',
          strokeColor: 'rgba('+color+',1)',
          pointColor: 'rgba('+color+',1)',
          pointStrokeColor: 'rgba('+color+',0.8)',
          pointHighlightFill: 'rgba('+color+',1)',
          pointHighlightStroke: 'rgba('+color+',1)',
          data: [firstTemperature, firstTemperature]
        }
      ]
    };

    var options = {
      scaleShowGridLines : true,
      scaleGridLineColor : 'rgba(251,251,251,0.1)',
      scaleGridLineWidth : 1,
      scaleShowHorizontalLines: true,
      scaleShowVerticalLines: false,
      bezierCurve : true,
      bezierCurveTension : 0,
      pointDot : true,
      pointDotRadius : 3,
      pointDotStrokeWidth : 1,
      pointHitDetectionRadius : 20,
      datasetStroke : true,
      datasetStrokeWidth : 2,
      datasetFill : true,
      legendTemplate : '<ul class=\'<%=name.toLowerCase()%>-legend\'><% for (var i=0; i<datasets.length; i++){%><li><span style=\'background-color:<%=datasets[i].strokeColor%>\'></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'
    };

    //Get chart canvas & context
    var ctx = document.getElementById('graph_temperature').getContext('2d');
    a.temperatureGraph = new Chart(ctx).Line(data, options);

    //Refresh screen size
    a.refreshSize();

    //Refresh screen size on resize
    $(window).resize(a.refreshSize);

    //Run timed events for the first time
    a.updateSecond();
    a.updateMinute();
    a.update15Minutes();

    //Start timer
    this.timer = window.setInterval(function(){
      a.tick();
    }, 3000);

  };

};

//Init app when page is loaded
$(document).ready(function(){
  'use strict';
  var app = new App($('#app'));
  app.init();
});