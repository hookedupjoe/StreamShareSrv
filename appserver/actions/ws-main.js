'use strict';
const THIS_MODULE_NAME = 'ws-main';
const THIS_MODULE_TITLE = 'Send and receive Websock data related to this applications core features';

var isSetup = false;
var wssMain = false;
var wsRoom;
var clients = {};
var users = {};

module.exports.setup = function setup(scope,options) {
    var config = scope;
    var $ = config.locals.$;

    function Route() {
        this.name = THIS_MODULE_NAME;
        this.title = THIS_MODULE_TITLE;
    }

    function getPeopleSummary(){
        var tmpList = {};
        for( var aID in users ){
            var tmpPerson = users[aID];
            if( tmpPerson.profile && tmpPerson.socketid ){
                var tmpName = tmpPerson.profile.name || 'Anonymous';
                var tmpUserID = tmpPerson.userid || 'Anonymous';
                var tmpLogo = tmpPerson.profile.logo || 'mdi-logo06.png';
                var tmpColor = tmpPerson.profile.color || 'teal';
                tmpList[aID] = {name:tmpName, userid: tmpUserID, color: tmpColor, logo: tmpLogo};
            }
        }
        return tmpList;
    }    

    function resendPeople(){
        wsRoom.sendDataToAll({action:'people', people: getPeopleSummary()});
    }

    function sendChat(theWS, theData){
        try {
            var tmpMsg = theData.message;
            var tmpUserID = theWS.userid;
            var tmpGroup = theData.group || '';
            
            if( !(users[tmpUserID] && users[tmpUserID].profile)){
                return;
            }

            var tmpName = users[tmpUserID].profile.name;
            var tmpColor = users[tmpUserID].profile.color || 'blue';
            var tmpIcon = users[tmpUserID].profile.logo || 'default.png';
            var tmpHost = users[tmpUserID].profile.host || false;

            var tmpNameTo = '';
            if( users[tmpMsg.to] ){
                var tmpUser = users[tmpMsg.to];
                var tmpSocketID = tmpUser.socketid;
                tmpNameTo = users[tmpMsg.to].profile.name
            }
            if( tmpMsg.to && (tmpMsg.vis == 'private')){
                wsRoom.sendDataToClient(tmpSocketID, {action:'chat', host: tmpHost, fromid: tmpUserID, fromcolor: tmpColor, fromicon: tmpIcon, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})
                wsRoom.sendDataToClient(theWS.id, {action:'chat', host: tmpHost, fromid: tmpUserID, fromcolor: tmpColor, fromicon: tmpIcon, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})
            } else {
                wsRoom.sendDataToAll({action:'chat', host: tmpHost, fromid: tmpUserID, fromcolor: tmpColor, fromicon: tmpIcon, fromname: tmpName, message: tmpMsg, toname: tmpNameTo, group: tmpGroup})
            }
        } catch (error) {
            console.error("Error in send chat",error);
        }
    }

    function updateProfile(theWS, theData){
        var tmpSocketID = theWS.id;
        var tmpUserID = theData.userid;
        var tmpProfile = theData.profile;
        theWS.userid = tmpUserID;
        
        users[tmpUserID] = {
            socketid: tmpSocketID,
            userid: tmpUserID,
            profile: tmpProfile
        }

        clients[tmpSocketID] = clients[tmpSocketID] || {};
        clients[tmpSocketID].profile = tmpProfile;
        clients[tmpSocketID].userid = tmpUserID;
        resendPeople();
    }
    
    function onConnect(ws){
        ws.userid = $.ws.mgr.getUniqueID();        
        ws.send(JSON.stringify({action: 'welcome', userid: ws.userid, id: ws.id, people:getPeopleSummary()}))
    }

    function onMessage(ws,data,isBinary){
        var tmpData = (''+data).trim();
        if( tmpData.startsWith('{')){
            tmpData = JSON.parse(tmpData);
        }
        if( tmpData.action ){
            if( tmpData.action == 'profile' && tmpData.profile){
                updateProfile(ws,tmpData);
            } else if( tmpData.action == 'chat'){
                sendChat(ws,tmpData);
            } else if( tmpData.action == 'ping'){
                //--- do nothing        
            } else {
                console.log('unknown action',tmpData.action);
            }
        }
    }

    function onSocketAdd(theID){
        //--- placeholder
    }

    function onSocketRemove(theID){
        if( clients[theID] ){
            var tmpUserID = clients[theID].userid || '';
            var tmpUser = users[tmpUserID];
            if( tmpUser && tmpUser.socketid ){
                //--- Clear socket it to show not active, but keep user with ID here
                //     ToDo: cleanup to remove inactive after x period?
                tmpUser.socketid = '';
            }
            delete clients[theID];
            resendPeople();
        }
    }

    if( options.websocket === true ){

        if( !isSetup ){
            wssMain = new $.ws.WebSocketServer({ noServer: true });
            wsRoom = new $.ws.WebSocketRoom({name:'stage', server: wssMain, onConnect: onConnect, onMessage: onMessage, onSocketAdd: onSocketAdd, onSocketRemove: onSocketRemove, pingInterval:0 });
            isSetup = true;
            console.log('StreamShare created new websock room')
        }
        
        return wssMain;
    }
    

    var base = Route.prototype;
    //==== End of common setup - add special stuff below
    //--- must have a "run" method *** 

    //--- Load the prototype
    base.run = function (req, res, next) {
        var self = this;
        return new Promise( async function (resolve, reject) {
            try {
                
                var tmpRet = {
                    status: true,
                    query:req.query
                }
                resolve(tmpRet);
            }
            catch (error) {
                console.log('Err : ' + error);
                reject(error);
            }

        });



    }








    //====== IMPORTANT --- --- --- --- --- --- --- --- --- --- 
    //====== End of Module / setup ==== Nothing new below this
    return async function processReq(req, res, next) {
        try {
            var tmpRoute = new Route();
            var tmpResults = await (tmpRoute.run(req, res, next));
            res.json({
                status: true,
                results: tmpResults
            })
        } catch (ex) {
            res.json({ status: false, error: ex.toString() })
        }
    }
};