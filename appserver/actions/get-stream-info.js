'use strict';

const THIS_MODULE_NAME = 'run-test';
const THIS_MODULE_TITLE = 'Test that the API works';

module.exports.setup = function setup(scope) {
    var config = scope;
    var $ = config.locals.$;
    function Route() {
        this.name = THIS_MODULE_NAME;
        this.title = THIS_MODULE_TITLE;
    }
    var base = Route.prototype;
    //==== End of common setup - add special stuff below
    //--- must have a "run" method *** 

    //--- Load the prototype
    base.run = function (req, res, next) {
        var self = this;
        return new Promise( async function (resolve, reject) {
            try {

                var tmpSetup = {
                    doctype: 'stream',
                    appid: 'StreamShare',
                    accountid: '_home',
                    dbname: '-mo-StreamShare'
                }

                
                var tmpUserID = $.AuthMgr.getCurrentUserId(req);
                var tmpAccessLevel = await $.AuthMgr.getAccessLevelForUser(tmpUserID, {db:tmpSetup.dbname});

                var tmpAccount = await $.MongoManager.getAccount(tmpSetup.accountid);
                var tmpDB = await tmpAccount.getDatabase(tmpSetup.dbname);
                var tmpDocType = tmpSetup.doctype;
                var tmpMongoDB = tmpDB.getMongoDB();
                var tmpDocs = await tmpMongoDB.collection($.MongoManager.options.prefix.datatype + tmpDocType).find().filter({__doctype:tmpDocType}).toArray();
                var tmpRet = {success:true};

                var tmpNoStream = '<b>No Stream Scheduled</b>'
                var tmpRet = {
                    streamStatus: false,
                    level: tmpAccessLevel,
                    streamURL: 'https://fans.direct-streamer.com/embed/video',
                    noStreamText : tmpNoStream
                }

                var tmpDoc = false;
                var tmpActiveDocs = [];
                var tmpPrimaryDoc = false;
                var tmpStreamIndex = {};
                tmpRet.streamCount = 0;

                if( tmpDocs.length > 0){
                    if( tmpDocs.length == 1){
                        tmpDoc = tmpDocs[0];
                    } else {
                        for( var iKey in tmpDocs ){
                            var tmpADoc = tmpDocs[iKey];
                            if( tmpADoc.status == "Active" ){
                                if( tmpADoc.streamtype == 'Primary' ){
                                    tmpPrimaryDoc = tmpADoc;
                                    tmpRet.defaultStream = tmpADoc.name;
                                }
                                tmpActiveDocs.push(tmpADoc);
                                tmpStreamIndex[tmpADoc.name] = tmpADoc;
                                tmpRet.streamCount++;
                            }
                        }
                        if( tmpActiveDocs.length == 1 ){
                            tmpDoc = tmpActiveDocs[0];
                        }
                        if( tmpPrimaryDoc ){
                            tmpDoc = tmpPrimaryDoc;
                        }

                    }
                    if( tmpDoc ){
                        if( tmpDoc.openstatus){
                            tmpRet.streamStatus = true;                       
                        }
                        if( tmpDoc.streamurl ){
                            tmpRet.streamURL = tmpDoc.streamurl;                  
                        }
                    }

                    tmpRet.streamIndex = tmpStreamIndex;
                    //tmpRet.activeStreams = tmpActiveDocs;
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