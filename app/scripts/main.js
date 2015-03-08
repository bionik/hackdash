//Made by @b10nik

//Linter preferences
/*global $, moment, Chart, io*/
/*jslint node: true*/

var config = {
  debug: true,
  apiLocation: 'http://192.168.11.2/pi_api/',
  maxRows: 30,
  color: '254,254,254',
  temperatureLabels: ['0h', '', '', '', '1h', '', '', '', '2h', '', '', '', '3h'],
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

  a.addMessage = function(data){
    log('addMessage');
    var dom = '';
    var source, template;

    if (data.type === 'message'){
      source = $('#content-mesage-template').html();
      template = window.Handlebars.compile(source);
      dom = $(template(data.data));

    } else if (data.type === 'notification') {
      source = $('#content-notification-template').html();
      template = window.Handlebars.compile(source);
      dom = $(template(data.data));

    } else if (data.type === 'status') {
      source = $('#content-status-template').html();
      template = window.Handlebars.compile(source);
      dom = $(template(data.data));
    }

    $('#content-irc').append(dom);
    $(dom).slideDown(400);

    while($('#content-irc').find('.row').length > config.maxRows){
      log('Over '+config.maxRows+' messages, delete first row');
      $('#content-irc').find('.row').first().remove();
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

  a.refreshLights = function(room1, room2){
    log('refreshLights');
    $('#room1, #room2').removeClass('on off');
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
    //log('updateSecond');
    var m = moment();
    $(a.timeContainer).html(m.format('HH:mm'));
    $(a.dateContainer).html(m.format('dddd, MMMM Do').toLowerCase());

  };

  a.updateMinute = function(){
    //log('updateMinute');

    //Get light status and update.
    a.updateLights();
  };

  a.update15Minutes = function(){
    //log('update15Minutes');

    //Get temperature and update it in the graph.
    a.updateTemperature();
  };

  a.updateLights = function(){
    log('updateLights');
    var room1, room2;

    $.when(
      $.get(config.apiLocation+'gpio/', {a: 'readPin', pin: 1}, function(response){
        log(response);
        room1 = parseInt(response.data, 10);
      }, 'JSON'),
      $.get(config.apiLocation+'gpio/', {a: 'readPin', pin: 0}, function(response){
        log(response);
        room2 = parseInt(response.data, 10);
      }, 'JSON')
    ).then(function(){
      a.refreshLights(room1 === 0, room2 === 0);
    });
  };

  a.updateTemperature = function(){
    $.get(config.apiLocation+'temp/', {a: 'getTemp'}, function(response){
      log(response);
      a.addTemperature( response.data );
    }, 'JSON');
  };

  a.init = function(){
    log('init');

    a.io = io('http://192.168.11.2:8008');
    a.io.on('packet', function(data) {
      log(data);
      if(typeof data.type !== 'undefined'){
        a.addMessage(data);
      }
    });

    Chart.defaults.global.scaleFontColor = 'rgba('+config.color+',1)';
    Chart.defaults.global.animationSteps = 30;

    var firstTemperature;

    $.when(
      $.get(config.apiLocation+'temp/', {a: 'getTemp'}, function(response){
        firstTemperature = response.data;
      }, 'JSON')

    ).then(function(){

      var data = {
        labels: ['',''],
        datasets: [
          {
            label: 'Temperature',
            fillColor: 'rgba('+config.color+',0.1)',
            strokeColor: 'rgba('+config.color+',1)',
            pointColor: 'rgba('+config.color+',1)',
            pointStrokeColor: 'rgba('+config.color+',0.8)',
            pointHighlightFill: 'rgba('+config.color+',1)',
            pointHighlightStroke: 'rgba('+config.color+',1)',
            data: [firstTemperature, firstTemperature]
          }
        ]
      };

      var options = {
        scaleShowGridLines : true,
        scaleGridLineColor : 'rgba('+config.color+',0.1)',
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
      }, 1000);

    });

  };

};

//Init app when page is loaded
$(document).ready(function(){
  'use strict';
  var app = new App($('#app'));
  app.init();
});