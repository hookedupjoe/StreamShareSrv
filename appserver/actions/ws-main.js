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
    // var OPEN_STATE = $.ws.WebSocket.OPEN;

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
                tmpList[aID] = {name:tmpName, userid: tmpUserID};
            }
        }
        return tmpList;
    }    

    function resendPeople(){
        wsRoom.sendDataToAll({action:'people', people: getPeopleSummary()});
    }

    function sendMeetingResponse(theWS, theData){
        var tmpMsg = theData.message || {};
        
        var tmpName = '';
        //--- User ID of person making the reply
        var tmpUserID = theWS.userid;
        if( users[tmpUserID] ){
            tmpName = users[tmpUserID].profile.name
        }

        if( users[tmpMsg.from] ){
            var tmpUser = users[tmpMsg.from];
            var tmpSocketID = tmpUser.socketid;
            wsRoom.sendDataToClient(tmpSocketID, {action:'meetingresponse', answer: theData.answer, fromid: tmpUserID, fromname: tmpName, message: tmpMsg})
        } else {
            console.log('unknown user',tmpMsg)
        }

        
    }
    
    function sendMeetingRequest(theWS, theData){
        var tmpName = '';
        var tmpUserID = theWS.userid;
        if( users[tmpUserID] ){
            tmpName = users[tmpUserID].profile.name
        }

        if( users[theData.to] ){
            var tmpUser = users[theData.to];
            var tmpSocketID = tmpUser.socketid;
            //console.log('req to tmpSocketID',tmpSocketID);
            wsRoom.sendDataToClient(tmpSocketID, {action:'meetingrequest', offer: theData.offer, fromid: theWS.userid, fromname: tmpName, message: 'Meeting request from ' + tmpName})
        } else {
            wsRoom.sendDataToClient(theWS.id, {action:'meetingreply', fromid: theWS.userid, status: false, message: 'No longer available'})  
        }
        //wsRoom.sendDataToClient(theWS.id, {action:'chat', fromid: tmpUserID, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})

    }
    
    function sendChat(theWS, theData){
        try {
            var tmpMsg = theData.message;
            var tmpUserID = theWS.userid;
            
            //ToDo: add who it is to and vis
            var tmpName = users[tmpUserID].profile.name;

            var tmpNameTo = '';
            if( users[tmpMsg.to] ){
                var tmpUser = users[tmpMsg.to];
                var tmpSocketID = tmpUser.socketid;
                tmpNameTo = users[tmpMsg.to].profile.name
            }
            if( tmpMsg.to && (tmpMsg.vis == 'private')){
                wsRoom.sendDataToClient(tmpSocketID, {action:'chat', fromid: tmpUserID, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})
                wsRoom.sendDataToClient(theWS.id, {action:'chat', fromid: tmpUserID, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})
            } else {
                wsRoom.sendDataToAll({action:'chat', fromid: tmpUserID, fromname: tmpName, message: tmpMsg, toname: tmpNameTo})
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
            } else if( tmpData.action == 'meeting'){
                sendMeetingRequest(ws,tmpData);
            } else if( tmpData.action == 'meetingresponse'){
                sendMeetingResponse(ws,tmpData);
                
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
            console.log('Meeting Center created new websock room')
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