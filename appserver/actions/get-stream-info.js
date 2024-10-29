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
                var tmpIsUser = false;
                var tmpUserID = '';
                if( req.session && req.session.passport && req.session.passport.user ){
                    var tmpUserInfo = req.session.passport.user;
                    tmpIsUser = true;
                    tmpUserID = tmpUserInfo.provider + '-' + tmpUserInfo.id
                }

                var tmpSetup = {
                    doctype: 'stream',
                    appid: 'StreamShare',
                    accountid: '_home',
                    dbname: '-mo-StreamShare'
                }

                
                var tmpAccessLevel = await await $.AuthMgr.getAccessLevelForUser(tmpUserID, {db:tmpSetup.dbname});

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
                if( tmpDocs.length > 0){
                    //--- for now, assume only one, later loop for active
                    tmpDoc = tmpDocs[0];
                    if( tmpDoc.openstatus){
                        tmpRet.streamStatus = ( tmpDoc.openstatus !== 'Closed' );                       
                    }
                    if( tmpDoc.closeddetails ){
                        tmpRet.noStreamText = tmpDoc.closeddetails;                  
                    }
                    if( tmpDoc.streamurl ){
                        tmpRet.streamURL = tmpDoc.streamurl;                  
                    }
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