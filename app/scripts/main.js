//Made by @b10nik

//Linter preferences
/*global $, moment, Chart, io*/
/*jslint node: true*/

var config = {
  debug: true,
  apiLocation: 'http://10.0.1.2/pi_api/',
  maxRows: 40,
  color: '254,254,254',
  dataLabels: ['0h', '', '', '', '1h', '', '', '', '2h', '', '', '', '3h'],
  buslineCount: 3
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
    a.humidityGraph.update();

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
      source = $('#content-message-template').html();
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

    } else {
      return false;

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
      var label = config.dataLabels[( a.temperatureGraph.datasets[0].points.length - i)-1];
      labels.push(label);
    }

    a.temperatureGraph.scale.xLabels = labels;
    a.temperatureGraph.update();

  };

  a.addHumidity = function(reading){
    log('addHumidity');
    if (a.humidityGraph.datasets[0].points.length > 12) {
      a.humidityGraph.removeData();
    }

    a.humidityGraph.addData([reading], '');

    var labels = [];
    for(var i=0; i<a.humidityGraph.datasets[0].points.length; i++){
      var label = config.dataLabels[( a.humidityGraph.datasets[0].points.length - i)-1];
      labels.push(label);
    }

    a.humidityGraph.scale.xLabels = labels;
    a.humidityGraph.update();

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

  a.refreshBuses = function(data){
    log(data);
    log('refreshBuses');
    var dom = '';

    var source = $('#content-buslines-template').html();
    var template = window.Handlebars.compile(source);
    dom = $(template(data));

    $('#content-buses').html(dom);
  };

  //Update every second
  a.updateSecond = function(){
    //log('updateSecond');
    var m = moment();
    $(a.timeContainer).html(m.format('HH:mm'));
    $(a.dateContainer).html(m.format('dddd, MMMM Do').toLowerCase());

    if(m.format('DDD') !== a.day) {
      log('Check if day changed!');
      var newDay = moment().format('DDD');
      if (newDay !== a.day){
        a.day = newDay;
        log('Day changed!');
        a.addMessage({type: 'status', data: {time: '00:00:00', message: 'Day changed to '+m.format('dddd, MMMM Do')}});
      }
    }

  };

  a.updateMinute = function(){
    //log('updateMinute');

    //Get light status and update.
    a.updateLights();

    //Update buslines
    a.updateBuses();

  };

  a.update15Minutes = function(){
    //log('update15Minutes');

    //Get temperature and update it in the graph.
    a.updateTemperature();

    //Get humidity and update it in the graph.
    a.updateHumidity();
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

  a.updateBuses = function(){
    log('updateBuses');
    var stop264;
    var stop662;
    $.when(
      $.get(config.apiLocation+'folistop/', {a: 'getStop', stop: 264}, function(response){
        log(response);
        stop264 = response.data;
      }, 'JSON'),
      $.get(config.apiLocation+'folistop/', {a: 'getStop', stop: 662}, function(response){
        log(response);
        stop662 = response.data;
      }, 'JSON')
    ).then(function(){
      var lines = [];
      lines.push({line: 'varsatie (264)', buses: stop264.slice(0, config.buslineCount)});
      lines.push({line: 'polttolaitoksenkatu (662)', buses: stop662.slice(0, config.buslineCount)});
      a.refreshBuses({lines: lines});
    });
  };

  a.updateTemperature = function(){
    $.get(config.apiLocation+'temp/', {a: 'getTemp'}, function(response){
      log(response);
      $('#temperature-value').html( response.data+'&deg;' );
      a.addTemperature( response.data );
    }, 'JSON');
  };

  a.updateHumidity = function(){
    $.get(config.apiLocation+'humidity/', {a: 'getHumidity'}, function(response){
      log(response);
      $('#humidity-value').html( response.data+'%' );
      a.addHumidity( response.data );
    }, 'JSON');
  };

  a.init = function(){
    log('init');

    a.io = io('http://10.0.1.2:8008');
    a.io.on('packet', function(data) {
      log(data);
      if(typeof data.type !== 'undefined'){
        a.addMessage(data);
      }
    });

    a.day = moment().format('DDD');

    Chart.defaults.global.scaleFontColor = 'rgba('+config.color+',1)';
    Chart.defaults.global.animationSteps = 30;

    var firstTemperature;
    var firstHumidity;

    $.when(
      $.get(config.apiLocation+'temp/', {a: 'getTemp'}, function(response){
        firstTemperature = response.data;
      }, 'JSON'),

      $.get(config.apiLocation+'humidity/', {a: 'getHumidity'}, function(response){
        firstHumidity = response.data;
      }, 'JSON')

    ).then(function(){

      var temperatureData = {
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

      var humidityData = {
        labels: ['',''],
        datasets: [
          {
            label: 'Humidity',
            fillColor: 'rgba('+config.color+',0.1)',
            strokeColor: 'rgba('+config.color+',1)',
            pointColor: 'rgba('+config.color+',1)',
            pointStrokeColor: 'rgba('+config.color+',0.8)',
            pointHighlightFill: 'rgba('+config.color+',1)',
            pointHighlightStroke: 'rgba('+config.color+',1)',
            data: [firstHumidity, firstHumidity]
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
      var temperatureCtx = document.getElementById('graph_temperature').getContext('2d');
      a.temperatureGraph = new Chart(temperatureCtx).Line(temperatureData, options);

      //Get chart canvas & context
      var humidityCtx = document.getElementById('graph_humidity').getContext('2d');
      a.humidityGraph = new Chart(humidityCtx).Line(humidityData, options);


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
