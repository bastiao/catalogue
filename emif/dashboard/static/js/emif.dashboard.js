/*
    # -*- coding: utf-8 -*-
    # Copyright (C) 2014 Ricardo F. Gonçalves Ribeiro and Universidade de Aveiro
    #
    # Authors: Ricardo F. Gonçalves Ribeiro <ribeiro.r@ua.pt>
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
var dashzone;
var feed;
$(function(){

    dashzone = $("#playground").dashboard();  
    feed = new SimpleTextWidget("feed", "Feed", "Feednews<hr /> Feedanother <hr /> Feed me crazy<hr />Feednews<hr /> Feedanother <hr /> Feed me crazy", 4, 3, 1, 1);
    dashzone.addWidget(feed);
    dashzone.addWidget(new SimpleTextWidget("actions", "Common Actions", "Feednews<hr /> Feedanother <hr /> Feed me crazy", 2, 2, 5, 2));
    dashzone.addWidget(new SimpleTextWidget("concepts", "Concepts", "Feednews<hr /> Feedanother <hr /> Feed me crazy", 2, 1, 5, 3));

    dashzone.loadConfiguration();
});

