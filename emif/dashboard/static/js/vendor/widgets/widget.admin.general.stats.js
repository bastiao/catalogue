/*
    # -*- coding: utf-8 -*-
    # Copyright (C) 2014 Universidade de Aveiro, DETI/IEETA, Bioinformatics Group - http://bioinformatics.ua.pt/
    #
    # This program is free software: you can redistribute it and/or modify
    # it under the terms of the GNU General Public License as published by
    # the Free Software Foundation, either version 3 of the License, or
    # (at your option) any later version.
    #
    # This program is distributed in the hope that it will be useful,
    # but WITHOUT ANY WARRANTY; without even the implied warranty of
    # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    # GNU General Public License for more details.
    #
    # You should have received a copy of the GNU General Public License
    # along with this program.  If not, see <http://www.gnu.org/licenses/>.
    #
*/

var FingerprintSchemasStatsWidget = function FingerprintSchemasStatsWidget(widgetname, width, height, pos_x, pos_y){

    FingerprintSchemasStatsWidget._base.apply(this, [widgetname, "Database Types - Statistics", width, height, pos_x, pos_y]);

}.inherit(DashboardWidget).addToPrototype({
    __renderTable : function(table){
        var tmp = '<table class="table table-bordered">';
        var len = table.length;

        for(var i=0;i<len;i++){
            tmp += "<tr>";

            var prop = table[i];
            var proplen = prop.length;
            for(var j=0;j<proplen;j++){
                if(i==0){
                    tmp+='<th><small>'+prop[j]+'</small></th>';
                } else {
                    if(j==0){
                        tmp+='<td style="width: 40%;"><small>'+prop[j]+'</small></td>';
                    } else {
                        tmp+='<td>'+prop[j]+'</td>';
                    }
                }
            }

            tmp += "</tr>";
        }
        tmp += '</table>';

        return tmp;
    },
    __init : function(gridster, parent){
        var self = this;

        self.icon = '<i class="fa fa-line-chart"></i>';

        self.content = "<center><h3>Loading...</h3></center>";

        self.header_style = "background-color: #d79494; border: 1px solid #b74c4c;";

        FingerprintSchemasStatsWidget._super.__init.apply(self, [gridster, parent]);

        $.get("api/dbtypes")
        .done(function(data) {
            if(data.types){
                self.db_types = data.types;
            } else {
                self.db_types = [];
            }
            self.content = "";
            var dbs = data['types'].length-1;

            var table = [
                ['Database'],
                ['Total databases'],['Total Database owners'],['Total Shared Users'],
                ['Max DB Shared'],['Avg DB Shared'], ['Total filled questions'], ['Max filled questions'],
                ['Average filled questions'],
                ['Total databases users (including shared and database owners)'],
                ['Total interested users (all profiles)']
            ];
            var len = table.length;
            $.each(data['types'], function (db){

                $.get("api/statistics/"+data['types'][db].id+"/all/all/all")
                .done(function(dataJson) {

                    if(dataJson.stats){

                        for(var i=0;i<len;i++){
                            var tmp="";

                            switch(i){
                                case 0: tmp = data['types'][db].name; break;
                                case 1: tmp = dataJson.stats.totalDatabases; break;
                                case 2: tmp = dataJson.stats.totalDatabaseOwners; break;
                                case 3: tmp = dataJson.stats.totalDatabaseShared; break;
                                case 4: tmp = dataJson.stats.maxDatabaseShared; break;
                                case 5: tmp = dataJson.stats.avgDatabaseShared; break;
                                case 6: tmp = dataJson.stats.totalFilledQuestions; break;
                                case 7: tmp = dataJson.stats.maxFilledFingerprints; break;
                                case 8: tmp = dataJson.stats.avgFilledFingerprints; break;
                                case 9: tmp = dataJson.stats.totalDatabaseUsers; break;
                                case 10: tmp = dataJson.stats.totalInterested; break;
                                default: tmp = "error"; break;

                            }
                            table[i].push(tmp);
                        }
                    } else {
                        self.content = "Error Loading User Statistics Widget";
                    }
                    if(dbs == db){
                        self.content+= self.__renderTable(table);
                    }

                    FingerprintSchemasStatsWidget._super.__refresh.apply(self);
                    $('.table', $('#'+self.widgetname)).parent().css('padding', '0px');

                  })
                .fail(function() {
                    self.content = ' Error loading User Statistics Widget';
                    FingerprintSchemasStatsWidget._super.__refresh.apply(self);

                });

            });

        })
        .fail(function() {
            self.content = ' Error loading Stats of the Fingerprint Schema Widget';

            FingerprintSchemasStatsWidget._super.__refresh.apply(self);
        });

    }
});
