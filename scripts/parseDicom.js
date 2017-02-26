window.onload = function () {

    var zip = new JSZip();
    var dicomName;
    var dcm;
    var pixelData,
    reqFrame,
    pixelPerSlice,
    slicePerFrame,
    rows,
    columns;


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


    function isFloat(n){
        return Number(n) === n && n % 1 !== 0;
    }

    function isInt(n){
        return Number(n) === n && n % 1 === 0;
    }

    function listToMatrix(list, elementsPerSubArray) {
        var matrix = [], i, k;
        for (i = 0, k = -1; i < list.length; i++) {
            if (i % elementsPerSubArray === 0) {
                k++;
                matrix[k] = [];
            }
            matrix[k].push(list[i]);
        }
        return matrix;
    }

    //
    // PARSE DICOM
    //
    function parseDCM(file){

        var reader = new FileReader();
        reader.readAsArrayBuffer(file);

        reader.onload = function(file) {
            var byteArray = new Uint8Array(reader.result);
            var dataSet;

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

                    // write to text file
                    zip.file("voxel spacing.txt", "x , y , z\n" + deltaX + " , " + deltaY + " , " + deltaZ );

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
                    pixelData = new Uint8ClampedArray(dataSet.byteArray.buffer, pixelDataElement.dataOffset);
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
        //
        // clear canvas
        var canvas = document.getElementById('canvas'),
        ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var start = reqFrame * pixelPerSlice * slicePerFrame;
        var end = (reqFrame + 1) * pixelPerSlice * slicePerFrame;
        var step = pixelPerSlice;
        var k = start;
        fileName = 0;

        console.log(start,end,step)
        function f() {
            //
            var vals = pixelData.slice( k , k+pixelPerSlice )
            drawCanvas(vals,rows,columns,fileName)
            fileName = fileName + 1
            //
            k = k + step ;
            if( k < end ){
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


        var dataUri = canvas.toDataURL('image/png');

        var img = zip.folder("images");
        img.file( pad(fileName,4).toString() + ".png" , dataUri.replace("data:image/png;base64,","") , {base64: true})


    }




    function pad(n, width, z) {
      z = z || '0';
      n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
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


dicomName


    function createDowloadButton(reqFrame,dicomName){
        var div = document.getElementById("buttonDiv");
        div.innerHTML = ""
        div.innerHTML = '<a class="btn btn-primary btn-md" href="#" id="downloadButton">download ' + dicomName.split('.')[0]  + "_" + reqFrame.toString() + '.zip</a>' 

        $("#downloadButton").click(function(){
            // after all done
            zip.generateAsync({type:"blob"})
            .then(function(content) {
                // see FileSaver.js
                // window.location = "data:application/zip;base64," + content;
                saveAs( content, dicomName.split('.')[0] + "_" + reqFrame.toString() + ".zip");
            });
        });
    }


}









