const fs = require('fs')
const path = require('path')
const drawionode = require('./drawio-node')
const _ = require('lodash');
const ROOT_ID = 1
/*
 **********************
 *** Create content ***
 **********************
*/


/**
 * Gets basics: mxObject (simple bloc): includes
 *  container (container)
 *  small input (input_func)
 *  small output (output_func)
 *  function (function)
 *  @return {String} compressed library
 */
const getBasics = ()=>{
	// at the end of the file
  return basics
}

/**
 * flowio lib contains the standard database/study/function diagrams
 * */
const importLibraryFlowio=(loadLocalLibrary)=>{
	console.log('hey')
	// at the end of the file
	loadLocalLibrary('flowio', flowio_lib)
}

/**
 * Returns ids for the blocks 
 * XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 *  @return {String} id
 */
const guidGenerator = ()=>{
  var S4 = function() {
     return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4());
}

/**
 * creates the minimized function cell
 * @param  {Array[String]} inputs list of input parameters names
 * @param  {Array[String]} outputs list of output parameters names
 * @param  {String} flowio_id VERY IMPORTANT: the index has to be created with these (diagram id's)
 * @param  {String} mxCell_func_style Style
 * @param  {Int} top_padding padding inside the function (top)
 * @param  {Int} padding_side padding inside the function (sides)
 * @return {Array[mxObject]} all small blocks and the function
 */
const createMinimizedFunctionCell = (inputs, outputs, flowio_id, function_name, mxCell_func_style=null, top_padding=10, padding_side=20)=>{
	let basics_lib = getBasics()//createMinimizedFunctionCell
	// get the building blocks
	let function_promise = drawionode.getSimpleBlockFromLibrary(basics_lib, 'function')
  let input_promise = drawionode.getSimpleBlockFromLibrary(basics_lib, 'input')
	let output_promise = drawionode.getSimpleBlockFromLibrary(basics_lib, 'output')
	return Promise.all([function_promise,input_promise,output_promise]).then(function(result){
			let real_func_id = flowio_id//'function'-guidGenerator()
			//function_id+'-function-'+Date.now()
			let func = result[0][0]
			let geo_func = func.getGeometry()
			let input = result[1][0]
			let geo_input = input.getGeometry()
			let output = result[2][0]
			let geo_output = output.getGeometry()
			// modify blocks position & name
			let input_blocks = inputs.map((input_text, index)=>(drawionode.modifySimpleBlock(block_o=input,id=guidGenerator(),id_parent=real_func_id, input_text, x=padding_side, y=index*(Number(geo_input.height)+top_padding)+top_padding)))
			let output_blocks = outputs.map((output_text, index)=>(drawionode.modifySimpleBlock(block_o=output,id=guidGenerator(),id_parent=real_func_id, output_text, x=2*padding_side+Number(geo_input.width), y=index*(Number(geo_output.height)+top_padding)+top_padding)))
			// change style
			if(mxCell_func_style) func.changeStyle(mxCell_func_style)
			let func_block = drawionode.modifySimpleBlock(func,id=real_func_id, id_parent=ROOT_ID, function_name, x=null, y=null, width=Number(geo_output.width)+Number(geo_input.width)+3*padding_side, height=(Number(geo_output.height)+top_padding)*Math.max(inputs.length, outputs.length)+top_padding, flowio_id=flowio_id)
			return [func_block].concat(input_blocks).concat(output_blocks)
	})
}

/**
 * Gets shape of object INSIDE 'flowio_key':'shape_container' 
 * (has to be related by parent=$shape_container.id)
 * @param  {mxObject} xml_obj the graph where shape_container is
 * @return {String?} style of the shape: the shape itself is not mxObject
 */
const getShapeStyle=(xml_obj)=>{
	let shapes = xml_obj.findChildrenRecursiveObjectFilter({'flowio_key':'shape_container'})
	let shape = null
	if(shapes.length>0){
		let id_parent = shapes[0].object.$.id
		let find_shapes = xml_obj.findChildrenRecursiveObjectFilter({'parent':id_parent})
		if(find_shapes.length>0){
			shape = find_shapes[0]//.mxCell
			return shape.mxCell.$.style
		}
	}
}

/**
 * Gets the function blocks from a given diagram (library)
 * (has to be related by parent=$shape_container.id)
 * @param  {mxObject} diagram the graph where shape_container is
 * @return {Array[mxObject]} all mxObjects 
 */
const importFunction=(diagram, file_id)=>{
	let shape_style = getShapeStyle(diagram)
	let inputs = drawionode.getClearLabels(diagram.findChildrenRecursiveObjectFilter({'flowio_key':'input_func'}))
	let name_func = drawionode.getClearLabels(diagram.findChildrenRecursiveObjectFilter({'flowio_key':'name'}))[0]
	let outputs = drawionode.getClearLabels(diagram.findChildrenRecursiveObjectFilter({'flowio_key':'output_func'}))
	return createMinimizedFunctionCell(inputs, outputs, file_id, name_func, shape_style).then((all_blocks)=>( {'blocks':all_blocks,'name':name_func}))
}

/**
 * Gets block: database / study from a given diagram
 * (has to be related by parent=$shape_container.id)
 * @param  {mxObject} diagram the graph where shape_container is
 * @param  {mxObject} file_id VERY IMPORTANT: indexed
 * @param  {mxObject} flowio_key database or study
 * @return {String?} style of the shape: the shape itself is not mxObject
 * 
 */
const importBlock=(diagram, file_id, flowio_key)=>{
	let basics_lib = getBasics()
	let function_promise = drawionode.getSimpleBlockFromLibrary(basics_lib, 'function')
	let name = drawionode.getClearLabels(diagram.findChildrenRecursiveObjectFilter({'flowio_key':'name'}))[0]
  let shape_style = getShapeStyle(diagram)
	return function_promise.then((data)=>{
		let func = data[0]
		if(shape_style) func.changeStyle(shape_style)
    func.object.$.flowio_key=flowio_key
		let func_block = drawionode.modifySimpleBlock(func,id=file_id, id_parent=ROOT_ID, name, null, null,null,null, flowio_id=file_id)
		return {'blocks':func_block,'name':name}
	})
}

/**
 * Is the diagram a database
 * @param  {mxObject} diagram the graph where shape_container i
 * */
const isDatabase = (diagram)=>{
	return diagram.findChildrenRecursiveObjectFilter({'flowio_key':'type_database'}).length>0
}

/**
 * Is the diagram a function
 * @param  {mxObject} diagram the graph where shape_container i
 * */
const isFunction = (diagram)=>{
	return diagram.findChildrenRecursiveObjectFilter({'flowio_key':'type_function'}).length>0
}

/**
 * Is the diagram a study
 * @param  {mxObject} diagram the graph where shape_container i
 * */
const isStudy = (diagram)=>{
	return diagram.findChildrenRecursiveObjectFilter({'flowio_key':'type_study'}).length>0
}

const getDuplicateIds=(original_path)=>{
	let index = createFlowioIndexArray(original_path)
	return index.then((item)=>{
		let groupby = _.groupBy(item,Object.keys)
		let return_val = Object.keys(groupby).reduce((acc,file_id)=>{
			if (groupby[file_id].length<=1) return acc
			let paths = groupby[file_id].map((item)=>item[file_id])
			paths = paths.sort((path_a,path_b)=>{ //{ aI8DmJniFy8GYhdvDRHG: 'C:\\Users\\bernat\\PDU\\diagrames\\cosetes\\funcio4.drawio' }
				return fs.statSync(path_a).birthtimeMs - fs.statSync(path_b).birthtimeMs
			})			
			return [...acc,...paths.slice(1)]
		},[])
		console.log('REPEATED IDS:', return_val)
		return return_val
	})
	
}

/**
 * Gets all local diagrams as a libraries (recursively): async
 * @param  {function} loadLocalLibrary the function that really loads the library to drawio
 * @param  {String} file_path all path: directory or drawio file
 * @param  {String} original_file_path the original path
 * @returns {Promise} when its finished will be resolved
 * */
const importLocalLibraries = (loadLocalLibrary, file_path, original_file_path, avoid_paths=[])=>{
	if(fs.lstatSync(file_path).isFile()){
		let key_lib = path.basename(file_path)
		if (key_lib.slice(-4)=='.xml'){
			let result = fs.promises.readFile(file_path,'utf8').then((data)=>{
				return {'xml':{'key':key_lib, 'value':data}}
			})
			return result
		}
		if (key_lib.slice(-7)=='.drawio'){
			let result = drawionode.readDiagram(file_path).then((read_diagram_obj)=>{
        let diagram = read_diagram_obj['diagram']
				let file_id = read_diagram_obj['id']//fs.lstatSync(file_path).ino
				if (avoid_paths.includes(file_path)){ 
					return
				}
				let xml_data = null
				if (isFunction(diagram)){
					xml_data = importFunction(diagram,file_id)
				}else if (isStudy(diagram)){
					xml_data = importBlock(diagram, file_id, 'study')
					//let id = diagram.findChildrenRecursiveObjectFilter( {'flowio_key':'database_modified'})[0].object.$.id
				}else if (isDatabase(diagram)){
					xml_data = importBlock(diagram, file_id, 'database')
				}
				if(xml_data!=null){
					return xml_data.then((data)=>{
						let all_blocks = data['blocks']
						let name_func = data['name']						
						let mxGraph = drawionode.getDiagram(all_blocks, ROOT_ID)
						let value = drawionode.compress(drawionode.toString(mxGraph,{headless:true}))						
						return {'drawio':{'key':name_func?name_func:file_id, 'value':value}}

					}).catch((err)=>(console.log(err)))
				}
			}).catch((err)=>(console.log(err)))
			return result
		}
	}else if(fs.lstatSync(file_path).isDirectory()) {	
		return fs.promises.readdir(file_path).then((files)=>{
			return Promise.all(files.map((file)=>importLocalLibraries(loadLocalLibrary,path.join(file_path, file),original_file_path, avoid_paths))).then((array_of_data)=>{
				let xmls = array_of_data.filter((obj)=>obj!=null&&Object.keys(obj)[0]=='xml')
				let drawios = array_of_data.filter((obj)=>obj!=null&&Object.keys(obj)[0]=='drawio')
				let folders = array_of_data.filter((obj)=>obj!=null&&Array.isArray(obj))
				xmls.forEach((xml_obj)=>{
					let key = xml_obj.xml.key
					let value = xml_obj.xml.value
					loadLocalLibrary(key, value)
				})
				if (drawios.length>0){
					let all_drawios_string = drawios.map((drawio_file)=>({"xml":drawio_file.drawio.value, "title":drawio_file.drawio.key,"w":80,"h":20,"aspect":"fixed"}))
					let value_drawios = '<mxlibrary>'+JSON.stringify(all_drawios_string)+'</mxlibrary>'
					let title_lib = path.relative(original_file_path, file_path)?path.relative(original_file_path, file_path):'./';
					loadLocalLibrary(title_lib, value_drawios)
				}
				return xmls.concat(drawios).concat(folders)
			})
		})
	}
}

const importLocalLibrariesWithoutDuplicates=(loadLocalLibrary, file_path)=>{
	return getDuplicateIds(file_path).then((duplicates)=>{
		return importLocalLibraries(loadLocalLibrary, file_path, file_path, duplicates)
	})	
}
/*
 *************************
 *** Visualize content ***
 *************************
*/

/**
 * Gets a dictionary of ids and paths
 * @param {String} original_path the root of flowio
 * @param {String} added_path to dir or to .drawio file
 * @return {Object} {id_diagram: path}
 */
const createFlowioIndex=(original_path, added_path='./')=>{
  let file_path = path.join(original_path,added_path)
  let lstat = fs.lstatSync(file_path)
  if(lstat.isDirectory()){
    return fs.promises.readdir(file_path).then((files)=>{
      return Promise.all(files.map((file)=>{
        return createFlowioIndex(original_path, path.join(added_path,file))
      })).then((all_tal)=>{
        return all_tal.flat().reduce((obj,item)=>{
          obj = {...obj,...item}
          return obj
        },{});
      })
    })
  }else if(lstat.isFile() && file_path.slice(-7)=='.drawio'){
    let diagram_obj = drawionode.readDiagram(file_path)
    let file_id = drawionode.getDiagramId(file_path)
    //console.log('file',file_id)
    let return_val = {}
    return_val[file_id]=file_path
    return return_val
  }
}

/**
 * Gets a dictionary of ids and paths
 * @param {String} original_path the root of flowio
 * @param {String} added_path to dir or to .drawio file
 * @return {Object} {id_diagram: path}
 */
const createFlowioIndexArray=(original_path, added_path='./')=>{
  let file_path = path.join(original_path,added_path)
  let lstat = fs.lstatSync(file_path)
  if(lstat.isDirectory()){
    return fs.promises.readdir(file_path).then((files)=>{
      return Promise.all(files.map((file)=>{
        return createFlowioIndexArray(original_path, path.join(added_path,file))
      })).then((all_tal)=>{
        return all_tal.flat().reduce((arr,item)=>{
         	return [...arr,item]
        },[]).filter((item)=>item!=null);
      })
    })
  }else if(lstat.isFile() && file_path.slice(-7)=='.drawio'){
    let diagram_obj = drawionode.readDiagram(file_path)
    let file_id = drawionode.getDiagramId(file_path)
    //console.log('file',file_id)
    let return_val = {}
    return_val[file_id]=file_path
    return return_val
  }
}

/**
 * Creates the index and saves it to the root
 * @param {String} original_path the root path where the .flowio will be written
 */
const createFileIndex=(original_path)=>{
  return createFlowioIndex(original_path).then((result)=>{
    fs.writeFile(path.join(original_path,'.flowio'), JSON.stringify(result, null, 2), (err)=>{
		})
		return result
  })
}
/**
 * Gets the index dictionary
 * @param {String} original_path 
 */
const getFileIndex=(original_path)=>{
  return fs.promises.readFile(path.join(original_path,'.flowio')).then((data)=>JSON.parse(data))
}
/**
 * Creates the full graph given a file_id
 * @param {Object} index relates ids with paths
 * @param {String} file_id id of what we want the 'logic' from
 * @param {Boolean} extract_func whether we want to explore functions
 * @param {Boolean} extract_studies whether we want to explore studies
 * @param {Int} max_depth max depth we want to go
 * @param {Object} already_explored recursive use
 * @param {Int} depth recursive use
 * @param {String} root_id recursive use
 * @param {Int} x recursive use
 * @param {Int} y recursive use
 * @param {Int} padding_top Padding between functions
 */
const extractLogicFromFunction=(index, file_id, extract_func=true, extract_studies=true, max_depth=null, already_explored={}, depth=0, root_id=ROOT_ID, x=0, y=0, padding_top=20)=>{
	let basics_lib = getBasics()
	let promise_container = drawionode.getSimpleBlockFromLibrary(basics_lib, 'container')  
	if (Object.keys(already_explored).includes(file_id)) return null
	if (!index[file_id]) return null
  return drawionode.readDiagram(index[file_id]).then((read_diagram_obj)=>{
    let diagram = read_diagram_obj['diagram']
		let input_ids = {}
		let output_ids = {}
		let new_id_parent = guidGenerator()
		new_already_explored={...already_explored}
		new_already_explored[file_id]=new_id_parent
		let title = drawionode.getClearLabels(diagram.findChildrenRecursiveObjectFilter( {'flowio_key':'name'}))[0]
		let all_blocks = []
		if (isStudy(diagram)) {
			let databases = diagram.findChildrenRecursiveObjectFilter({'flowio_key':'database'})
			let databases_modified = diagram.findChildrenRecursiveObjectFilter({'flowio_key':'database_modified'})
			all_blocks=[...databases, ...databases_modified]
		} else if (isFunction(diagram)) {
			let input_cells = diagram.findChildrenRecursiveObjectFilter({'flowio_key':'input_func'})
			let output_cells = diagram.findChildrenRecursiveObjectFilter({'flowio_key':'output_func'})
			all_blocks=[...input_cells, ...output_cells]
		}
		let studies_small = diagram.findChildrenRecursiveObjectFilter({'flowio_key':'study'})
		let function_cells_small = diagram.findChildrenRecursiveObjectFilter({'flowio_key':'function'})
		all_blocks=[...all_blocks, ...function_cells_small, ...studies_small]

    let input_cells_small = diagram.findChildrenRecursiveObjectFilter({'flowio_key':'input'})
		let output_cells_small = diagram.findChildrenRecursiveObjectFilter({'flowio_key':'output'})
		let children_of_all_blocks = [...input_cells_small,...output_cells_small]
    let x_min = all_blocks.reduce((acc,item)=>{
      let new_x = parseInt(item.object.mxCell[0].mxGeometry[0].$.x)
      if (new_x<acc) return new_x
      return acc
    },Number.MAX_SAFE_INTEGER)
    let y_min = all_blocks.reduce((acc,item)=>{
      let new_x = parseInt(item.object.mxCell[0].mxGeometry[0].$.y)
      if (new_x<acc) return new_x
      return acc
    },Number.MAX_SAFE_INTEGER)
    let x_max = all_blocks.reduce((acc,item)=>{
      let new_x = parseInt(item.object.mxCell[0].mxGeometry[0].$.x)+parseInt(item.object.mxCell[0].mxGeometry[0].$.width)
      if (new_x>acc) return new_x
      return acc
    },0)
    let y_max = all_blocks.reduce((acc,item)=>{
      let new_x = parseInt(item.object.mxCell[0].mxGeometry[0].$.y)+parseInt(item.object.mxCell[0].mxGeometry[0].$.height)
      if (new_x>acc) return new_x
      return acc
		},0)

		let width_total =  x_max-x_min
		let height_total =  padding_top+y_max-y_min
		
		//cascade of function promises		
		let extract_logic_promises = []
		if(max_depth==null || depth<max_depth){
			let cells_to_extract = []
			if (extract_func)cells_to_extract=[...cells_to_extract, ...function_cells_small]
			if (extract_studies) cells_to_extract=[...cells_to_extract,...studies_small]
			extract_logic_promises = cells_to_extract.reduce((acc,func)=>{
				if (acc.length==0){
					return [extractLogicFromFunction(index,func.object.$.flowio_id, extract_func, extract_studies, max_depth, new_already_explored,	depth+1,ROOT_ID,x, y+height_total+padding_top)]
				}
				return [...acc,(acc[acc.length-1].then((result)=>{
					let x_func = result['x']
					let y_func = result['y']
					let width = result['width']
					let new_new_already_explored = result['already_explored']

					let return_val =  extractLogicFromFunction(index,func.object.$.flowio_id, extract_func, extract_studies, max_depth, new_new_already_explored, depth+1,ROOT_ID,x_func+width, y_func)
					return return_val
				}))].filter((item)=>item!=null)
			},[])
		}
    return Promise.all([...extract_logic_promises,promise_container]).then((all_promises_results)=>{
      all_promises_results = all_promises_results.filter((item)=>item!=null)
      let container = all_promises_results[all_promises_results.length-1]
			let all_func = all_promises_results.slice(0,all_promises_results.length-1)
			let container_modified = drawionode.modifySimpleBlock(container[0], new_id_parent, root_id, title, x, y, width_total, height_total)
      all_blocks = all_blocks.map((item, index)=>{
        let geo = item.getGeometry()
      	return drawionode.modifySimpleBlock(item,null,new_id_parent,null,geo.x-x_min,padding_top+geo.y-y_min)
      })
			let edges = drawionode.findEdges(diagram, [...all_blocks,...children_of_all_blocks])
				.map((item)=>{
          let new_edge = drawionode.removeEdgePoints(item)
					//canviar style dels edges
          let style = new_edge.getStyle()
					let find_edgeStyle = /edgeStyle=.*;/g
          let new_style = style.replace(find_edgeStyle, '')
          new_edge.changeStyle(new_style)
          return new_edge
        })
			let all_func_blocks = all_func.flatMap((item)=>item.blocks)
			let all_blocks_to_return = [...edges,container_modified,...all_func_blocks,...all_blocks,...children_of_all_blocks]
				.sort((a,b)=>{
					//edges per sobre
					if(a._isEdge) return 1
					else return 0
				})
      return {'title':title,'x':x,'y':y,'width':width_total, 'height':height_total,'blocks':all_blocks_to_return, 'already_explored':new_already_explored}
    })

	})
}

const extractLogicFromFile=(index,path)=>{
	let paths_x_id = _.invert(index)
	if (!paths_x_id[path]) return
  return extractLogicFromFunction(index, paths_x_id[path]).then((func_extraction)=>{
		let all_blocks = func_extraction['blocks']
		let mxGraph = drawionode.getDiagram(all_blocks, ROOT_ID)
		return {'data':drawionode.toString(mxGraph,{headless:true}),'name':func_extraction['title']+'-expanded.flowio'}
  })

}

const createSidebar=(file_path)=>{
  let name_of_file = file_path.match(/(?:[^\/\\](?!(\/|\\)))+$/gim)
  if (name_of_file==null) {name_of_file = "./"}
  else name_of_file = name_of_file[0]
  if(fs.lstatSync(file_path).isFile() && path.basename(file_path).slice(-3)=='.md'){
    return name_of_file
  }else if(fs.lstatSync(file_path).isDirectory()) {
    let files = fs.readdirSync(file_path)
    let return_obj = {}
    return_obj[name_of_file]=files.map((file)=>createSidebar(path.join(file_path, file))).filter((a)=>a!=null)
    if(return_obj[name_of_file].length==0) return null
    return return_obj
  }
}

const printSidebar=(sidebar,deep=1)=>{
  if (typeof sidebar === 'string') {return "-  "+sidebar+"("+sidebar+")"}
  let key = Object.keys(sidebar)[0]
  let final_tema = sidebar[key].map((value)=>printSidebar(value, deep+1))
  let prefix ='\n'+'  '.repeat(deep)
  return key+prefix+(final_tema.join(separador=prefix))
}

const createMdFile = (index, file_id)=>{
	if (!index[file_id]) return
	return drawionode.readDiagram(index[file_id]).then((read_diagram_obj)=>{
    let diagram = read_diagram_obj['diagram']
		let title = drawionode.getClearLabels(diagram.findChildrenRecursiveObjectFilter( {'flowio_key':'name'}))[0]
		let description =drawionode.getClearLabels(diagram.findChildrenRecursiveObjectFilter( {'flowio_key':'description'}))[0]
		if (isStudy(diagram)){

		}else if (isDatabase(diagram)){

		}else if (isFunction(diagram)){

		}
		return `## ${title} {${file_id}}
		${description}`
	})
}
function createDocumentation(index, file_path, flowio_path, depth=1){
	if (path.basename(file_path)[0]=='_') return
	if(!fs.existsSync(path.join(flowio_path,'./_docs'))) fs.mkdirSync(path.join(flowio_path,'./_docs'));
	if(!fs.existsSync(path.join(flowio_path,'./_docs/README.md'))) fs.writeFileSync(path.join(flowio_path,'./_docs/README.md'),'docs');
	if(depth>100) return
	if(fs.lstatSync(file_path).isFile()){
		let key_lib = path.basename(file_path)
		if (key_lib.slice(-7)=='.drawio'){
			let file_id = fs.lstatSync(file_path).ino
			return createMdFile(index,file_id).then((data)=>{
				let path_without_extension = file_path.slice(0,-7)
				let path_file = path.relative(flowio_path,path_without_extension)
				let new_file = path.join(flowio_path,'./_docs',path_file)+'.md'
				return fs.promises.writeFile(new_file, data)
			})
		}
	}else if(fs.lstatSync(file_path).isDirectory()) {
		let relative_folder = path.relative(flowio_path,file_path)
		if(!fs.existsSync(path.join(flowio_path,'./_docs', relative_folder))) fs.mkdirSync(path.join(flowio_path,'./_docs', relative_folder));
		if(!fs.existsSync(path.join(flowio_path,'./_docs', relative_folder, './README.md'))) fs.writeFileSync(path.join(flowio_path,'./_docs', relative_folder, './README.md'),'docs');
		return fs.promises.readdir(file_path).then((files)=>{
			return Promise.all(files.map((file)=>createDocumentation(index,path.join(file_path, file),flowio_path, depth+1)))
		})
	}
}

module.exports={
		//importLocalLibraries: importLocalLibraries,
		importLocalLibrariesWithoutDuplicates:importLocalLibrariesWithoutDuplicates,
		importLibraryFlowio:importLibraryFlowio,
    createFileIndex:createFileIndex,
		getFileIndex:getFileIndex,
		extractLogicFromFile:extractLogicFromFile,
		extractLogicFromFunction:extractLogicFromFunction,
		/*createMdFile:createMdFile,
		createDocumentation:createDocumentation,
		getDuplicateIds:getDuplicateIds*/
		isStudy:isStudy,
		isFunction:isFunction,
		isDatabase:isDatabase
}
const basics = '<mxlibrary>[{"xml":"dVJNc4IwEP01HO1AouC1QvXSnjz02ImwSGpgaQgF++u7CUF0pj0w7Mt7efuRDXhajwct2uoNC1ABfwl4qhHNFNVjCkoFLJRFwLOAsZC+gO3/YSPHhq3Q0Jg/LuDpE3JDCiVONlnmyFiRdldiY5nOXBU4Jv7qcSZWnfyh02cSRKwdF5Kis/snOyMN3Uyy2ZCyTp5e4UorFQ4SPy5wnbLLpu3NRM1NMAsf+1uKYhr7pgArDcl0qKSBYytyyw40RjqrTG1bi3zpe1FLZbO99rksBLml2HRo/Rx/dJ1l0ZawUPLcEMhpfKDpoDMaL5CiQu3S8yI+xZv4xrzLwlRzMqnUnbIsS5bnt8a/QRsY/32m6K7pA2ANRl9J4i+wJ5bwhMfJZr3mjLMwhlXEJ5fBl0BoOz12WIE8V97YL0Aougmfb+bLWlDgRz1DvygzXBbSSR/29Rc=","w":80,"h":20,"aspect":"fixed","title":"input"},{"xml":"dVJNb4MwDP01OU4KQYPuuMLay3bqYccpBReyBsxCGHS/fk4IpZU2pAjb7/nbLM6aaW9kV79hCZrFLyzODKKdpWbKQGsmuCpZnDMhOD0mdv+gkUd5Jw209g8HPH5CYYmh5dElyz2YaOJuT9g6pLcXDR5JvgZcgIde/ZD1mQiR6KYVJKny/3RrlSXPNF8CUtY5ZmD40k4aR4UfZ7jM2XGw3WBnbOlCOPW+wbUqYXBoS3BUTlHHWlk4dLJw6EhzJFttG9dbFGrfyUZpl+51KFQpKVqGbY8unscPvrU82gQ9Q43G54q5/8gutapashU0VyBw21uDZ7ihPiVpLJMr8q5KWy9FKK1vmBCVj5BeJ/INxsL07/6im2HsARuw5kKUMcQndDOvmNegqjp4hbVz2c96dfVcj4GEMN9FDeexqOsZeurdlf4C","w":80,"h":20,"aspect":"fixed","title":"output"},{"xml":"dVNLU4NADP41HHXobgv1aFsfB51x9ODR2UIKqwvBJbWtv94ElhademBI8uX5JRvpZbW/86YpHzEHF+mbSC89IvVStV+Cc5GKbR7pVaRUzF+kbv9BJx0aN8ZDTWcCcP0OGbGHM2spturAxLHvYoO1IC0dHHRI8rmVNhbO1nBRgi1K1q7ZZcY5ZyecpaL7pwuyxMHpasjJhfu0waPrbuNwZ/HtAw59A5ttnZHFukeHUZSov6c8taa+wJPNjHuQOZ6wtV0CvVojEVZcanC4drYQgLBha0mVTD1hsSWPH/BqcyoHS2kaSd94zKBt2bIrLcFLYzIx73hJbPO4rXPIhxj7LVh8GSeJnqirq1RP0+k8Fsz47KWHE6HXOrdEh74bQOczmOfTYx8jZK7WOpGIjJkzzL0PtYTJW1NZJ7zdg/sCmfBIq0wM+3/vYDLi8w6wAvIHdtkFAoTxpL+VeNi1GNNgM22vF8fQY7ZnPilTF7waFYf6WoewsGI1Dfqo3PxMNfWnmnEEvjYEC2G9HZ8yC6NBTqbuVgY13Pugnt5VHz1+dj8=","w":260,"h":70,"aspect":"fixed","title":"function"},{"xml":"dVLLcsMgDPwa7gb/gd00p17a3DNKrNq0PDxYje18fSGAQzrNgRlJu9IuAla3etk7GIc326Fi9Y7VrbOWYqSXFpViopIdq1+YEJU/TLw+QfkNrUZwaOifBnv6wjN5hoJTEAuEg0P0ldYaAmnQxRGfys7SHr9xjazzI5wFRUgfvUy0KozoNEutwPisGUgHPe7DicDRh7wGkrfnMevkNczPjE3ssI6BRcFi3UTpCzrC5el9eeFoj1YjudVTZtnRkDynnVQDyn7IbTwVYYqFfuvdxr373YHpVVhXMiByW1oTr1Je6G2jSz3xRw4UoTNA2Ngf003lo/mguMq9dNt3TtPL5vT+g2J3+cF+AQ==","w":220,"h":110,"aspect":"fixed","title":"container"}]</mxlibrary>'
const flowio_lib = '<mxlibrary>[{"xml":"xVhRj5s4EP41PG4FhpDkcTe7aR/aaqU9qY+RA0NwazA1ZpP0198YmwDBrHq3uR5RFDz2DPZ833w28cJNcfooaZV/ESlwL3zywo0UQpm74rQBzj3is9QLHz1CfPx6ZDvTG7S9fkUllOp3HIhxqNWZg7FAeoAX2xRS5eIgSsqfeuuDFE2Zgg7gY6sf81mICo0BGr+DUucX9ksHoY0SaMpVwW1vJkq1EVzI9omh76/X2621W6cgxraZm57QaHW1aGRiTUtjUlQewC44muagdbQJ+AiiACXPOEQCp4q9jqPT2jQPl3EX12fBMCLxT9YhNrn1z6YdBv44hJmo9epBuJeSngfDKj2gnn9OtHI/Z/vvxuONmUHXGuSkN7U8aZti/x0SHZ7TvSboYxss5soiNqJP/LMRXcdd3WJ5jwNIVJ36Trw76N9SFLsUdpzusqZMmLcJvYewC42zMNHNWLOijIsjE7sfYJdW0gJMT0focJBHy/UBucfUPeZMwUtFWzIdsQavaMo4H9A0XcAqjdBeKyl+wKBnRfZh3BP2FaSCkzdXkDNk7ByWFrwjS1VuSd4BmgM75DZMfEW2IV8HUA+RxKYFcxbYGsuZpXQXuPMtGlU1qoVrnPbodmlPaZ23Yx0YQIAoLF0YrONlSONZEXkXJit/XFBkNcUoiP4YRinUiWRVVzCuEnJhZ90UE6UDwMUN62Ys7+aaYpkt9MeFZdxeN8bSZmG1mEAX+Q7olvF7oZvstTbiK+UNjGU0D3qZGwlrcklKr524X+praHIIMGcl3HUL0hIcaJfFVISf6p8NFHRWdi/m4SSvzgwIhxpzYIKpnfSYBaUo9YGiRiqx8oCGRd/6qz1M3JE5wgmkgaY4WnKWplBOTiZjIRlQKXrjDEI5O2CoxwT5BNj5UIFkiDzIl8ssO5V6pgrtZWshvo6qqckSyu9tlAJn1p6ZbsDcYD1VnfWNVMclMzgtSee3Ala6d4Lln9kJsiwjSeJiWhrv48V/pB7/s/JvhdSVqtdQX7TeL1jJMmRdSt1I1TmtYJdgNiiKghzDtXoTrvrICk7L9zLYOsRkvI8uw0kyQ+JIZuC/O5sTMV47xPhK1bpi/qwBeBY101sndu2FUqJwVLsSlUsFv9nlEW3RWOB9JUUCdT1TA32VtFEMh/0PrXBRmVhSdxzf0oJxndJPwF9Bz+iK/MSld1aOJ3o3f7qdOw//FjNWbzIjCK5eWaa7dOBixo2k7mrXzWgy3kw3+CLHdOX4X+E43ULVWWN6r7Wwpcg/eYPRvrvec1iaJifzUpqLYt/MUWj+PSaj6Tp1nrsoREFIblPrxCGUN0LwqrSx2f9fYl5nh3+n/A0=","w":950.0000000000001,"h":340,"aspect":"fixed","title":"function"},{"xml":"7ZhLc9owEIB/jY/J2PIDOBZo2kP6mKYzPTKyLbAaWXJlOUB/fVe2bGMsKAlMT3VgglYrebXfPgyOv8h3HyQusk8iJczx3zv+Qgqhmk/5bkEYc5BLU8dfOgi58HbQw4lZr551CywJV5YFIv5JEgUaDMf6Zst6MmKgO18LrmfWOCH1RPSr0lbMF6KSlEiY+ky2vRg+bfR/tS9A/12KFY5xSdrd4JbNho1WY9eaiS0Vq2eyb26t1676lejgJEgPh4cs1Z41piGZiTyuSth4m1FFnorG6C34EWSZyvXZPH0oythCMCHrdf4ap7M0BHmppHgmBzOYBJ6POktfiFRkd9Kp3oF1H4jIiZJ7UDELkHuP0ASh0IsmgedOps0GW5qqzKw3WNyM0E1mNo2MDJfNeNNt3AOED8Yf7dAgvRRv78QWpJ64K+lvTREUUFDsxpS5yFcpWTG8iuM0fRVkjvMjtv55tqLiKdGq7lv4TnBi4xsHUegGt+HrTdwR0cn0nxFNSZlIWiTUWfjO3B9wsQEw+ooKvlpXPBnCCG4IA2LhwOXNZYEU6j8bpKi+zE5PdUguvehKaMYL03DELHAtzCbRtcxGVdnc+QWzigyTMvP63BmkadI5pc9E362vQ5ElnRnl5K49kE5oTy8JxykNfq9yTsqTydyJD61Ew/gAHmoYBCOoxuphGHDBiVaGWKJ8A4KwH30XEFfLO3Qq4gTEgY5xkGQ0TQkH2TBOU1xm9cA7iqVgHKWuO5s9ANc5ZnQDWy0TCChod/68IJICeiKfOis9s/lXrEDOawmqy4qOTZpg9s7skoNl2km3CF3kuvfj6J0Ft6k4thLzIGSOG7NLU2ZglFNO13DIFNsLTZlh6OcJ+BdDEMphnYnO1plyS3OG+bUOMwsi37ihzf3gfnZwTWcjZ/q2huy5V9fvUS2YWGrBUU7VbtSBuIdcTutQ/EvhjZvof4w7AU6eN3VOfKmUrggHufCAc8q0Yz4S9kJ00B4lCbIlw+mG2sz8ML5EZ5ryRWSjs2Q7JIasP86LWz1bjdBNR+iSroQeI+zDufasmdG1KckoSx/xXlTatFIBqXY0z4Skv3X69MUUy5YLiuw1tF/0pDczt5FEP9J9bR3rHYk+4d1A8RGXqjVQMIaLksasjZocyw3lc6GUyI3SDZLUD4cokeU5GaqcLS2D62HObDD9U/1tGP3G8RYWbdowslaWpqB0Z2vb3GOtswx6yTdzxuBkk1P6u1IXSoWgXNU+COfwAncudKMIwfAFjL1+DC+tLqHxcTgLlGd9HwLQt6RUl/Kcnu9S0WX40OsfsMbfc10bPu8/vrfjC9E/xOfZ8I074X98F+O7tHi+AR8M+x+k6rnB71V/AA==","w":950.0000000000001,"h":382,"aspect":"fixed","title":"database"},{"xml":"7VlLc+I4EP41HJOy5RccA4TZQ2Z3arNVe6SEJbAmssXIcoD59duy5RcWhCyurT2MQwC1WrLU39cPmYm3SI9fJN4nXwWhfOI9T7yFFEJV39LjgnI+QQ4jE285QciB/wlaXeh1y15njyXNlGWA2HynsQINjjf6ZsuyM+SgO9+KTPfk6sRp2RP+KETd8ZCznyB9AgXk749tJ3zb6c9MpGtC15zmqiCsnhNuXE1bKVWr23JxYGL9Rk/VAjKc0qqn3gbSzf4O22UhKYqMUK3qwJyHhCn6usex7j2AIUGWqFRvztWLZ5wvBBeyHOttXEK2eliupHijnR7XibwZbRb5TqWix4tWdTsr/EJFSpU8gUo9IKqs7hwYUUkli6ZGllC2S8w0oZHhvGrvmqlazOCLsULdNCheRJTQPJZsH4ORu5DYbG9UFRNZHwJvRAiAAR1DV9cQmm2g/2zQhOVlZnotibh0wzuhMgaYBgOkfMeCVBTei9TAWX2zfMwL2nfFxG09pueccWOU1v88p7y6IosTc5bRh3pD2o1dPSQYOvJz/qOgKZ7owBHiVGNZvVe3L9KM5hfduxF3d4D63AGsVJ8gA8DNjvoUyUSm3TMHnrFsB4Kgbf0lYIXLB3SJjQI4oqkPkoQRQjOQ9TlMcJ6UDfeMZ/6QwY4zm61W2jCc7WCqZQxko9A531PJgBZUvjardM3k37ACeVZKkKNn1bxlMeZPZpYUVsbHikCGwobl7ix6HBJ95o8TkmwxaCVkSSLYRc4mC28yh4jipCxjW9gzwfZwlCd4T9cxmBsDX2U/JAVXQ1J+YCnH2Uj2C72+AS1hwkMW67nO3RF9ECdCS5w486nSbpqIWJLbAvIKp4zrzf1G+TvVPDzjPbLx+3LWrHr+NuZBVzJvi261mpvQCq6i1VjdoOUN0XJtaI3E9bMgva3s3obWhSgk02x2fqeHYcRVJ43dk87Sp08VTnrg2gzrOkp0PXcnIt0U+adLpy0mM2LNz5j6rofGcTw0rJzGgu4jP5sO3IqSHX01TSFVInYiw/y5lZ4lkVbnRZQZSZvxO1XqZLwKF0r0jVzdU9+oZ7AcKGNYhGaVSGG5o02YudmuknKs2Ht/+nsJH8zpkaZ7MAFyiH7b4Lz5TjDRJQJM5GQC3oocy0mwvFCAYoWrwV0Gz66H+jranaCqIWVg+oDKmwqml00jwPHbrgTvj0Lp2ugi5yMc2zi/8cOgzOIjcD46i16zoQ/YDg8j5Bp7NLuG0zoVBFI4UL4HWEXI/wFioDYlng0x5Pl+QMZBbBr2IWuODB3IQgtk0/GjlusOyoO2TK8ckuPSFd/1x3JYkHcqp7IAMD1lrk4YJy/4JAq9gVwBBnVrngjJfupc3pbxWNblAwrt1Xs76FVPZm4jqX688K02v3sm+oqPPcUXnKt6gYJzvM/Zhtd8SCFMsmwulBKpURoBcPDJx1nnCoIe/ihyH/1O93TAhiaM9z3Y/zQfhgRANgK4A5jNuavvFwYWC1J17cfpVlkOK0rnt/r49VLqLP1W8qfZpH/x8KV0QGmIthcsU6URgjm8wE0WDpxYdNZYQNtt2/DS6hIOZBnsBSpJfR8KlDjQXN2M9vWnAnXN/RGA6PNPBYb4eTb8hjX+L/xuxy9A/yF+w+c4gJ/3C7878ItuDKD/Aj9byZPAsTkWUG6sN1xAVrJWQI3SWeVz/bHEPQ+rt9OYxvbqcxr4gTPyE1EzwHd7qS1wLSeywIKFH91b20Cz/eWjVO39MPIP","w":949.9999999999999,"h":557.0000000000001,"aspect":"fixed","title":"study"}]</mxlibrary>'
