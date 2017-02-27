var NRRDheader ;
var NRRDdata ;
var filename = "hello.nrrd";
var dataSet;
var offset;

window.onload = function () {

    var dicomName;
    var dcm;
    var pixelData,
    reqFrame,
    pixelPerSlice,
    slicePerFrame,
    rows,
    columns;

    NRRDheader = "NRRD0004\r\n"
    NRRDheader += "type: uchar\r\n"
    NRRDheader += "dimension: 3\r\n"
    NRRDheader += "space: left-posterior-superior\r\n"

    var dicomFile = document.getElementById('dicomFile');
    var dicomFileLabel = document.getElementById('dicomFileLabel');
    var selectorDiv = document.getElementById("selectorDiv");
    var buttonDiv = document.getElementById("buttonDiv");

    dicomFile.addEventListener('change', function(e) {

        dicomFileLabel.innerHTML = "<i class='fa fa-circle-o-notch fa-spin'></i> loading ..."

        selectorDiv.innerHTML = ""
        buttonDiv.innerHTML = ""

        dcm = dicomFile.files[0]
        dicomName = dicomFile.files[0].name
        parseDCM(dcm)

        var canvas = document.getElementById('canvas'),
        ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);


    });


    //
    // PARSE DICOM
    //
    function parseDCM(file){

        var reader = new FileReader();
        reader.readAsArrayBuffer(file);

        reader.onload = function(file) {
            var byteArray = new Uint8Array(reader.result);
            dataSet;

            // Invoke the paresDicom function and get back a DataSet object with the contents
            try {

                dataSet = dicomParser.parseDicom(byteArray);

                if(dataSet.warnings.length > 0)
                {
                    console.log("error in dicomParser 1")
                }
                else
                    {   


                    //
                    // PIXEL SPACING
                    //
                    var deltaX = dataSet.double('x0018602c')
                    if ( !isFloat(deltaX) || deltaX === undefined ){
                        console.log ( "deltaX is not a float or is undefined.."  )
                    }
                    //
                    var deltaY = dataSet.double('x0018602e')
                    if (!isFloat(deltaY) || deltaY === undefined ){
                        console.log ( "deltaY is not a float or is undefined.."  )
                    }
                    //
                    var deltaZ = dataSet.double('x30011003')
                    if (!isFloat(deltaZ) || deltaZ === undefined){
                        console.log ( "deltaZ is not a float or is undefined.."  )
                    }

                    //
                    // No of frames (to be displayed on UI)
                    //
                    var noOfFrames = parseInt( dataSet.string('x00280008') ) 
                    if (!isInt(noOfFrames) || noOfFrames === undefined){
                        console.log ( "noOfFrames is not a float or is undefined.."  )
                    }
                    //
                    $("#frameSelector").prop("disabled",false);
                    //
                    // rows and columns per slice
                    //
                    rows = parseInt( dataSet.int16('x00280010') )
                    if (!isInt(rows) || rows === undefined){
                        console.log ( "rows is not a float or is undefined.."  )
                    }
                    columns = parseInt( dataSet.int16('x00280011') )
                    if (!isInt(columns) || columns === undefined){
                        console.log ( "columns is not a float or is undefined.."  )
                    }

                    //
                    // INTENSITY
                    //
                    var pixelDataElement = dataSet.elements.x7fe00010;
                    //
                    offset = pixelDataElement.dataOffset
                    pixelData = new Uint8ClampedArray(dataSet.byteArray.buffer, pixelDataElement.dataOffset);

                    console.log (pixelData)
                    // IF THEY DONT EXIST
                    if (pixelData === undefined){
                        console.log("x7FE00010 - pixelData info does not exist")
                    } 


                    // 
                    // my CALCS
                    //
                    pixelPerSlice = rows*columns;
                    slicePerFrame = ( pixelData.length / pixelPerSlice ) / noOfFrames


                    createSelector(noOfFrames)
                    dicomFileLabel.innerHTML = dicomName +  ' loaded. '
                    console.log(deltaX,deltaY,deltaZ,noOfFrames,rows,columns,pixelPerSlice,slicePerFrame)


                    NRRDheader += "sizes: " +  columns + " " + rows + " " + slicePerFrame + "\r\n"
                    NRRDheader += "space directions: (" +  deltaX + ",0,0) (0," + deltaY + ",0) (0,0," + deltaZ + ")\r\n"
                    NRRDheader += "kinds: domain domain domain\r\n"
                    NRRDheader += "endian: little\r\n"
                    NRRDheader += "encoding: raw\r\n"
                    NRRDheader += "space origin: (0,0,0)\r\n"
                    NRRDheader += "\r\n"


                }

            }
            catch(err)
            {
                console.log(err);
            }
            finally 
            {   
            }

        }

    }


    // pixelData is int not byte anymore
    function getImages(pixelData,reqFrame,pixelPerSlice,slicePerFrame,rows,columns){

        reqFrame = reqFrame - 1
        //
        // clear canvas
        var canvas = document.getElementById('canvas'),
        ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        start = reqFrame * pixelPerSlice * slicePerFrame;
        end = (reqFrame + 1) * pixelPerSlice * slicePerFrame;

        var step = pixelPerSlice;
        var k = start;
        fileName = 0;

        // buffer, byteOffset, length
        NRRDdata = new Uint8Array( dataSet.byteArray.buffer , offset + start , pixelPerSlice*slicePerFrame );

        console.log(start,end,step)

        function f() {
            //
            var vals = pixelData.slice( k , k+pixelPerSlice )
            drawCanvas(vals,rows,columns,fileName)
            fileName = fileName + 1
            //
            k = k + step ;
            if( k <= end ){
                setTimeout( f, 1 ); //25
            }
            // when done
            else{
                createDowloadButton(reqFrame,dicomName)
                

            }
        }
        f();





    }



    function loadFrameNo(frames){

        var element = document.getElementById("frameSelector");
        element.innerHTML = ""
        element.innerHTML += '<option value="">choose a frame</option>'
        for (var i = 0 ; i < frames ; i++){
             element.innerHTML += '<option value=' + (i+1).toString() + '>' + (i+1).toString() + '</option>'
        }


    }




    function drawCanvas(vals,rows,columns,fileName){


        var total = rows * columns * 4;
        var buffer = new Uint8ClampedArray( total ); 

        var counter = 0
        for(var i = 0;  i< (rows * columns ) ; i++) {
            buffer[counter]   =  vals[i]
            buffer[counter+1] =  vals[i]
            buffer[counter+2] =  vals[i] 
            buffer[counter+3] =  255
            counter = counter+4     
        }

        // create off-screen canvas element
        var canvas = document.getElementById('canvas'),
        ctx = canvas.getContext('2d');

        canvas.style.margin = "7px";
        canvas.width = columns;
        canvas.height = rows;

        // create imageData object
        var idata = ctx.createImageData(columns, rows);

        // set our buffer as source
        idata.data.set(buffer);

        // update canvas with new data
        ctx.putImageData(idata, 0, 0);

    }



    function createSelector(frames){

        var div = document.getElementById("selectorDiv");
        div.innerHTML = ""
        div.innerHTML = '<label for="sel1">Frame of Interest</label><select class="form-control" id="frameSelector"></select>'

        loadFrameNo(frames)

        $("#frameSelector").change(function(){
            // set reqFrame
            reqFrame =  parseInt ( this.value )
            console.log ( reqFrame )
            // make images
            getImages(pixelData,reqFrame,pixelPerSlice,slicePerFrame,rows,columns)
            // make generate button ready
        });

    }


    function createDowloadButton(reqFrame,dicomName){

        var div = document.getElementById("buttonDiv");
        div.innerHTML = ""
        div.innerHTML = '<a class="btn btn-primary btn-md" href="#" id="downloadButton">download ' + dicomName.split('.')[0]  + "_" + reqFrame.toString() + '.zip</a>' 

        $("#downloadButton").click(function(){

            var combined = writeNRRD(NRRDheader , NRRDdata ) 
            var blob = new Blob([ combined ], {type: "application/octet-stream"});
            saveAs(blob, filename);

        });

    }

}


//
//
//      .M"""bgd      db `7MMF'   `7MF'`7MM"""YMM
//     ,MI    "Y     ;MM:  `MA     ,V    MM    `7
//     `MMb.        ,V^MM.  VM:   ,V     MM   d
//       `YMMNq.   ,M  `MM   MM.  M'     MMmmMM
//     .     `MM   AbmmmqMA  `MM A'      MM   Y  ,
//     Mb     dM  A'     VML  :MM;       MM     ,M
//     P"Ybmmd" .AMA.   .AMMA. VF      .JMMmmmmMMM
//
//

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(view){"use strict";if(typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var doc=view.document,get_URL=function(){return view.URL||view.webkitURL||view},save_link=doc.createElementNS("http://www.w3.org/1999/xhtml","a"),can_use_save_link="download"in save_link,click=function(node){var event=new MouseEvent("click");node.dispatchEvent(event)},is_safari=/Version\/[\d\.]+.*Safari/.test(navigator.userAgent),webkit_req_fs=view.webkitRequestFileSystem,req_fs=view.requestFileSystem||webkit_req_fs||view.mozRequestFileSystem,throw_outside=function(ex){(view.setImmediate||view.setTimeout)(function(){throw ex},0)},force_saveable_type="application/octet-stream",fs_min_size=0,arbitrary_revoke_timeout=500,revoke=function(file){var revoker=function(){if(typeof file==="string"){get_URL().revokeObjectURL(file)}else{file.remove()}};if(view.chrome){revoker()}else{setTimeout(revoker,arbitrary_revoke_timeout)}},dispatch=function(filesaver,event_types,event){event_types=[].concat(event_types);var i=event_types.length;while(i--){var listener=filesaver["on"+event_types[i]];if(typeof listener==="function"){try{listener.call(filesaver,event||filesaver)}catch(ex){throw_outside(ex)}}}},auto_bom=function(blob){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)){return new Blob(["\ufeff",blob],{type:blob.type})}return blob},FileSaver=function(blob,name,no_auto_bom){if(!no_auto_bom){blob=auto_bom(blob)}var filesaver=this,type=blob.type,blob_changed=false,object_url,target_view,dispatch_all=function(){dispatch(filesaver,"writestart progress write writeend".split(" "))},fs_error=function(){if(target_view&&is_safari&&typeof FileReader!=="undefined"){var reader=new FileReader;reader.onloadend=function(){var base64Data=reader.result;target_view.location.href="data:attachment/file"+base64Data.slice(base64Data.search(/[,;]/));filesaver.readyState=filesaver.DONE;dispatch_all()};reader.readAsDataURL(blob);filesaver.readyState=filesaver.INIT;return}if(blob_changed||!object_url){object_url=get_URL().createObjectURL(blob)}if(target_view){target_view.location.href=object_url}else{var new_tab=view.open(object_url,"_blank");if(new_tab==undefined&&is_safari){view.location.href=object_url}}filesaver.readyState=filesaver.DONE;dispatch_all();revoke(object_url)},abortable=function(func){return function(){if(filesaver.readyState!==filesaver.DONE){return func.apply(this,arguments)}}},create_if_not_found={create:true,exclusive:false},slice;filesaver.readyState=filesaver.INIT;if(!name){name="download"}if(can_use_save_link){object_url=get_URL().createObjectURL(blob);setTimeout(function(){save_link.href=object_url;save_link.download=name;click(save_link);dispatch_all();revoke(object_url);filesaver.readyState=filesaver.DONE});return}if(view.chrome&&type&&type!==force_saveable_type){slice=blob.slice||blob.webkitSlice;blob=slice.call(blob,0,blob.size,force_saveable_type);blob_changed=true}if(webkit_req_fs&&name!=="download"){name+=".download"}if(type===force_saveable_type||webkit_req_fs){target_view=view}if(!req_fs){fs_error();return}fs_min_size+=blob.size;req_fs(view.TEMPORARY,fs_min_size,abortable(function(fs){fs.root.getDirectory("saved",create_if_not_found,abortable(function(dir){var save=function(){dir.getFile(name,create_if_not_found,abortable(function(file){file.createWriter(abortable(function(writer){writer.onwriteend=function(event){target_view.location.href=file.toURL();filesaver.readyState=filesaver.DONE;dispatch(filesaver,"writeend",event);revoke(file)};writer.onerror=function(){var error=writer.error;if(error.code!==error.ABORT_ERR){fs_error()}};"writestart progress write abort".split(" ").forEach(function(event){writer["on"+event]=filesaver["on"+event]});writer.write(blob);filesaver.abort=function(){writer.abort();filesaver.readyState=filesaver.DONE};filesaver.readyState=filesaver.WRITING}),fs_error)}),fs_error)};dir.getFile(name,{create:false},abortable(function(file){file.remove();save()}),abortable(function(ex){if(ex.code===ex.NOT_FOUND_ERR){save()}else{fs_error()}}))}),fs_error)}),fs_error)},FS_proto=FileSaver.prototype,saveAs=function(blob,name,no_auto_bom){return new FileSaver(blob,name,no_auto_bom)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(blob,name,no_auto_bom){if(!no_auto_bom){blob=auto_bom(blob)}return navigator.msSaveOrOpenBlob(blob,name||"download")}}FS_proto.abort=function(){var filesaver=this;filesaver.readyState=filesaver.DONE;dispatch(filesaver,"abort")};FS_proto.readyState=FS_proto.INIT=0;FS_proto.WRITING=1;FS_proto.DONE=2;FS_proto.error=FS_proto.onwritestart=FS_proto.onprogress=FS_proto.onwrite=FS_proto.onabort=FS_proto.onerror=FS_proto.onwriteend=null;return saveAs}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!=null){define([],function(){return saveAs})}
var saveTA = (tarr, n) => { let b = new Blob([tarr], {type: 'application/octet-binary'}); return saveAs(b, n);}


function stringToUint8Array(string) {
  let array = new Uint8Array(string.length);
  for (let index of Array(string.length).keys()) {
    array[index] = string.charCodeAt(index);
  }
  return array;
}


function writeNRRD(header , data) {
    // header is a string
    // data is a Uint8ClampedArray 
    var headerBytes = stringToUint8Array(header);
    // now both are Uint8Array
    var out = new Uint8Array( headerBytes.length + data.length )
    // set
    out.set(headerBytes);
    out.set(data, headerBytes.length);
    //
    // console.log(headerBytes)
    // console.log(data)
    console.log(out)
    return out;
}

//
//
//     `7MMF'   `7MF'MMP""MM""YMM `7MMF'`7MMF'
//       MM       M  P'   MM   `7   MM    MM
//       MM       M       MM        MM    MM
//       MM       M       MM        MM    MM
//       MM       M       MM        MM    MM      ,
//       YM.     ,M       MM        MM    MM     ,M
//        `bmmmmd"'     .JMML.    .JMML..JMMmmmmMMM
//
//

function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}

function isInt(n){
    return Number(n) === n && n % 1 === 0;
}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
