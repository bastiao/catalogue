/*
 * Author: Ricardo Ribeiro <ribeiro.r@ua.pt>
 * Dashboard plugin that uses gridster for the grid, and is bootstrap 2 styled
 */

(function($) {
    $.fn.dashboard = function(options) {
        var self = this;

        var settings = $.extend({

        }, options);

        var gridster;
        var timer = 0;

        var widgets = [
            
        ];

        var private_funcs = {
            __init: function() {
                var width = (parseFloat($(self).width()) / 6) - 10;

                var cols, rows;



                if (width < 130) {
                    width = (parseFloat($(self).width()) / 4) - 10;

                    cols = 4;
                    rows = 4;
                } else {
                    cols = 6;
                    rows = 4;
                }

                gridster = $(".gridster > ul").gridster({
                    widget_base_dimensions: [width, 200],
                    widget_margins: [5, 5],
                    helper: 'clone',
                    max_cols: cols,
                    max_rows: rows,
                    min_cols: cols,
                    min_rows: rows,
                    resize: {
                        enabled: true,
                        max_size: [cols, rows],
                        min_size: [2, 1],
                        stop: function(e, ui, $widget) {
                            console.log("invoking stop from resize");
                            private_funcs.__clampHeight($widget);
                            public_funcs.saveConfiguration();
                        }
                    },
                    draggable: {
                        handle: '.widget-header',
                        stop: function(event, ui) {
                            public_funcs.saveConfiguration();
                        }
                    },
                }).data('gridster');

            },
            __delay: function(callback, ms) {
                    clearTimeout(timer);
                    timer = setTimeout(callback, ms);
            },
            __clampHeight: function(context) {
                $('[data-clampedheight]', context).each(function() {
                    var elem = $(this);
                    var parentPanel = elem.data('clampedheight');
                    if (parentPanel) {
                        var sideBarNavWidth = $(parentPanel).height() - 40 - parseInt(elem.css('paddingTop')) - parseInt(elem.css('paddingBottom')) - parseInt(elem.css('marginTop')) - parseInt(elem.css('marginBottom')) - parseInt(elem.css('borderTopWidth')) - parseInt(elem.css('borderBottomWidth'));

                        elem.css('height', sideBarNavWidth);
                    }

                });
            }, __supports_storage: function () {
              try {
                return 'localStorage' in window && window['localStorage'] !== null;
              } catch (e) {
                return false;
              }
            },
            __updateAllcoords:  function(){
                var this_widgets = gridster.$widgets;
                for(var i=0;i<this_widgets.length;i++){
                    private_funcs.__updatecoords($(this_widgets[i]));
                }
            },
            __updatecoords: function(widget){
                for(var i=0;i<widgets.length;i++){
                    if(widgets[i].widgetname == widget.attr('id')){
                        widgets[i].width = widget[0].dataset.sizex;
                        widgets[i].height = widget[0].dataset.sizey;
                        widgets[i].pos_x = widget[0].dataset.col;
                        widgets[i].pos_y = widget[0].dataset.row;
                        break;
                    }
                }
            }

        };

        var public_funcs = {
            addWidget: function(widget) {
                console.log('Add new widget');

                if(widget instanceof DashboardWidget){
                    if (widget.__validate() == true){
                        widget.__init(gridster);
                        widgets.push(widget);

                        private_funcs.__clampHeight($('#'+widget.widgetname));

                    }

                    
                } else {    
                    console.error("You can only add DashboardWidget objects to this dashboard.");
                }

            },
            removeWidget: function() {
                console.log('Remove widget');
            },
            refresh: function() {
                console.log("Refreshing");
            },
            saveConfiguration: function(){
                if(private_funcs.__supports_storage()){

                    private_funcs.__updateAllcoords();

                    var serialization = public_funcs.serialize();

                    localStorage.setItem("dashboard_preferences", serialization);

                } else {
                    console.error("Your browser doesn't support local storage!");
                    return null;
                }

            },
            loadConfiguration: function(){
                if(private_funcs.__supports_storage()){

                    gridster.destroy();
                    $(self).html('<div class="gridster"><ul></ul></div>');
                    widgets = [];
                    private_funcs.__init();

                    try{
                        var parsed_configurations = JSON.parse(localStorage.getItem("dashboard_preferences"));

                        for(var i=0;i<parsed_configurations.length;i++){
                            var this_widget;
                            // I dont know any other generic way of doing this without using eval, 
                            // i know eval is evil... but its a controled environment without user input, 
                            // dont beat me lol
                            try {
                                var tryme = "this_widget = new "+parsed_configurations[i].type+"();";
                                eval(tryme);
                                this_widget.deserialize(parsed_configurations[i]);

                                public_funcs.addWidget(this_widget);

                            } catch(err){
                                console.log(err);
                                console.error("Couldnt create new widget from serialized input of type "+parsed_configurations[i].type);
                            }
                        }
                    } catch(err){
                        console.warn("There seems to be nothing to be loaded, going with default configuration.");
                    }
                    
                    
                } else {
                    console.error("Your browser doesn't support local storage!");
                    return null;
                }

            }, serialize:   function(){
                var serialization = "[";

                for(var i=0;i<widgets.length;i++){
                    if(i == 0)
                        serialization+=widgets[i].serialize();
                    else 
                        serialization+=","+widgets[i].serialize();
                }
                serialization+="]";

                return serialization;
            }
        };

        $(self).html('<div class="gridster"><ul></ul></div>');

        private_funcs.__init();

        $(window).resize(function() {
            private_funcs.__delay(function() {
                gridster.destroy();

                private_funcs.__init();

            }, 700);
        });
        return public_funcs;

    };
}(jQuery));

var DashboardWidget = function DashboardWidget(widgetname, width, height, pos_x, pos_y) {
        this.widgetname = widgetname;
        this.width = width;
        this.height = height;
        this.pos_x = pos_x;
        this.pos_y = pos_y;
        this.header = "";
        this.content = "";
    
}.addToPrototype({
    __init  :   function(gridster){
        var widget = ['<li id="'+ this.widgetname+'"><div class="widget-header"><div title="Drag to change widget position" class="dragtooltip pull-left"><i class="icon-align-justify"></i></div>'+this.header+
        '</div><div class="accordion-body"><div style="overflow:auto; height: auto;" data-clampedheight="#'+
        this.widgetname+'" class="accordion-inner">'+this.content+'</div></div></li>', this.width, this.height, this.pos_x, this.pos_y];

        gridster.add_widget.apply(gridster, widget)

        $(".dragtooltip", $('#'+this.widget_name)).tooltip({'container': 'body'});
    },
    // private methods
    __validate : function(){
        if (!(typeof this.widgetname == 'string' || this.widgetname instanceof String)) {
            console.warn('Widget name on Dashboard widget must be a string');
            return false;
        }
        if (!(typeof this.width == 'number' || this.width instanceof Number)) {
            console.warn('Width on Dashboard widget must be a number.');
            return false;
        }
        if (!(typeof this.height == 'number' || this.height instanceof Number)) {
            console.warn('Height on Dashboard widget must be a number.');
            return false;
        }
        if (!(typeof this.pos_x == 'number' || this.pos_x instanceof Number)) {
            console.warn('pos_x on Dashboard widget must be a number.');
            return false;
        }
        if (!(typeof this.pos_y == 'number' || this.pos_y instanceof Number)) {
            console.warn('pos_y on Dashboard widget must be a number.');
            return false;
        }

        return true;
    },
    // public methods
    serialize : function(){
        return  '{'+
                    '"type": "'+this.constructor.name+'",'+
                    '"widgetname": "'+this.widgetname+'",'+
                    '"width": '+this.width+','+
                    '"height": '+this.height+','+
                    '"pos_x": '+this.pos_x+','+
                    '"pos_y": '+this.pos_y+','+
                    '"header": "'+this.header+'",'+
                    '"content": "'+this.content+'"'+
                '}';
    }, deserialize : function(json){
        this.widgetname = json.widgetname;
        this.width = json.width;
        this.height = json.height;
        this.pos_x = json.pos_x;
        this.pos_y = json.pos_y;
        this.header = json.header;
        this.content = json.content;
    }
});

var SimpleTextWidget = function SimpleTextWidget(widgetname, header, content, width, height, pos_x, pos_y){
    SimpleTextWidget._base.apply(this, [widgetname, width, height, pos_x, pos_y]);

    this.header = header;
    this.content = content;

}.inherit(DashboardWidget).addToPrototype({
    __validate : function(){
        console.log();
        var success = SimpleTextWidget._super.__validate.apply(this);

        if(success){
            if (!(typeof this.header == 'string' || this.header instanceof String)) {
                console.warn('Header on SimpleTextWidget must be a string');
                return false;
            }
            if (!(typeof this.content == 'string' || this.content instanceof String)) {
                console.warn('Content on SimpleTextWidget must be a string');
                return false;
            }

            return true;
        } else {
            return false;
        }
    }
});