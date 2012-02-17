/* 
 * Kuda includes a library and editor for authoring interactive 3D content for the web.
 * Copyright (C) 2011 SRI International.
 *
 * This program is free software; you can redistribute it and/or modify it under the terms
 * of the GNU General Public License as published by the Free Software Foundation; either 
 * version 2 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; 
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program; 
 * if not, write to the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, 
 * Boston, MA 02110-1301 USA.
 */

(function() {
	"use strict";
	
	var shorthand = editor.tools.behavior;
	shorthand.treeData = shorthand.treeData || {};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var MSG_WILDCARD = shorthand.treeData.MSG_WILDCARD = 'Any',
		MESSAGES = 'messages',
		FUNCTIONS = 'functions';
	
	shorthand.treeData.chainTable = (function() {
		var chainTable = new Hashtable();
		// Animation
		chainTable.put('hemi.AnimationGroup' + '_' + 'start', [hemi.msg.start, hemi.msg.stop]); // Leads to stop()
		chainTable.put('hemi.AnimationGroup' + '_' + 'stop', [hemi.msg.stop]);
		// Burst
		chainTable.put('hemi.ParticleBurst' + '_' + 'trigger', [hemi.msg.burst]);
		// Emitter
		chainTable.put('hemi.ParticleEmitter' + '_' + 'hide', [hemi.msg.visible]);
		chainTable.put('hemi.ParticleEmitter' + '_' + 'show', [hemi.msg.visible]);
		// Trail
		chainTable.put('hemi.ParticleTrail' + '_' + 'start', [hemi.msg.start]);
		chainTable.put('hemi.ParticleTrail' + '_' + 'stop', [hemi.msg.stop]);
		// HudDisplay
		chainTable.put('hemi.HudDisplay' + '_' + 'clear', [hemi.msg.visible]); // Calls hide()
		chainTable.put('hemi.HudDisplay' + '_' + 'hide', [hemi.msg.visible]);
		chainTable.put('hemi.HudDisplay' + '_' + 'nextPage', [hemi.msg.visible]); // Calls showPage()
		chainTable.put('hemi.HudDisplay' + '_' + 'previousPage', [hemi.msg.visible]); // Calls showPage()
		chainTable.put('hemi.HudDisplay' + '_' + 'show', [hemi.msg.visible]); // Calls showPage()
		chainTable.put('hemi.HudDisplay' + '_' + 'showPage', [hemi.msg.visible]);
		// Mesh
		chainTable.put('hemi.Mesh' + '_' + 'move', [hemi.msg.start, hemi.msg.stop]); // Leads to stop
		chainTable.put('hemi.Mesh' + '_' + 'setMovable', [hemi.msg.move]);
		chainTable.put('hemi.Mesh' + '_' + 'setResizable', [hemi.msg.resize]);
		chainTable.put('hemi.Mesh' + '_' + 'turn', [hemi.msg.start, hemi.msg.stop]); // Leads to stop
		// Model
		chainTable.put('hemi.Model' + '_' + 'load', [hemi.msg.load]);
		chainTable.put('hemi.Model' + '_' + 'setFileName', [hemi.msg.load]); // Calls load()
		chainTable.put('hemi.Model' + '_' + 'unload', [hemi.msg.unload]);
		// State
		chainTable.put('hemi.State' + '_' + 'load', [hemi.msg.load]);
		chainTable.put('hemi.State' + '_' + 'nextState', [hemi.msg.load, hemi.msg.unload]); // Calls load(), unload()
		chainTable.put('hemi.State' + '_' + 'previousState', [hemi.msg.load, hemi.msg.unload]); // Calls load(), unload()
		chainTable.put('hemi.State' + '_' + 'unload', [hemi.msg.unload]);
		// Timer
		chainTable.put('hemi.Timer' + '_' + 'start', [hemi.msg.start, hemi.msg.stop]); // Leads to stop()
		chainTable.put('hemi.Timer' + '_' + 'stop', [hemi.msg.stop]);
		// Transform
		chainTable.put('hemi.Transform' + '_' + 'move', [hemi.msg.start, hemi.msg.stop]); // Leads to stop
		chainTable.put('hemi.Transform' + '_' + 'turn', [hemi.msg.start, hemi.msg.stop]); // Leads to stop
		// Camera
		chainTable.put('hemi.Camera' + '_' + 'moveOnCurve', [hemi.msg.start, hemi.msg.stop]); // Leads to update()
		chainTable.put('hemi.Camera' + '_' + 'moveToView', [hemi.msg.start, hemi.msg.stop]); // Leads to update()
		chainTable.put('hemi.Camera' + '_' + 'update', [hemi.msg.stop]);
		// Citizen
		chainTable.put('hemi.Citizen' + '_' + 'cleanup', [hemi.msg.cleanup]);
		
		return chainTable;
	})();
	
	var methodsToRemove = shorthand.treeData.methodsToRemove = [
        'constructor',
        'init',
        'onRender',
		'_getId',
		'_setId',
		'_toOctane',
		'_clean'
	];
		
////////////////////////////////////////////////////////////////////////////////////////////////////
// Local Variables
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var commonMethods = {
		'hemi.AnimationGroup': ['reset', 'start', 'stop'],
		'hemi.Audio': ['pause', 'play', 'seek', 'setVolume'],
		'hemi.ParticleCurve': ['pause', 'play', 'start', 'stop'],
		'hemi.ParticleBurst': ['trigger'],
		'hemi.ParticleEmitter': ['hide', 'show'],
		'hemi.ParticleTrail': ['start', 'stop'],
		'hemi.HudDisplay': ['hide', 'nextPage', 'previousPage', 'show'],
		'hemi.Model': ['load', 'unload'],
		'hemi.State': ['load', 'nextState', 'previousState', 'unload'],
		'hemi.Timer': ['pause', 'reset', 'resume', 'start', 'stop'],
		'hemi.Mesh': ['move', 'turn', 'cancelInteraction', 'cancelMoving', 'cancelTurning', 
			'setMovable', 'setMoving', 'setPickable', 'setTurnable', 'setTurning', 'setResizable',
			'setVisible'],
		'hemi.Transform': ['move', 'turn', 'cancelInteraction', 'cancelMoving', 'cancelTurning', 
			'setMovable', 'setMoving', 'setPickable', 'setTurnable', 'setTurning', 'setResizable',
			'setVisible'],
		'hemi.Camera': ['disableControl', 'enableControl', 'moveOnCurve',
			'moveToView', 'orbit', 'rotate', 'truck']
	};

	var owners = new Hashtable();
	
////////////////////////////////////////////////////////////////////////////////////////////////////
// Methods
////////////////////////////////////////////////////////////////////////////////////////////////////

	function isCommon(citizen, method) {
		var type = citizen._octaneType ? citizen._octaneType : citizen.name,
			methList = commonMethods[type],
			common = false;
		
		if (citizen.parent != null) {
			common = isCommon(citizen.parent, method);
		}
		
		if (!common && methList != null) {
			common = methList.indexOf(method) !== -1;
		}
		
		return common;
	}
	
	function getNodeName(citizen, config) {
		var nodeName = config.prefix;
		
		if (citizen === null) {
			return null;
		} else if (citizen === MSG_WILDCARD) {
			nodeName += citizen;
		} else if (citizen._octaneType !== undefined) {
			var type = citizen._octaneType.split('.').pop(),
				path = type + 'Type',
				id = citizen._getId(),
				cit;

			// determine paths
			if ((citizen instanceof hemi.Transform || citizen instanceof hemi.Mesh)) {
				cit = owners.get(citizen);
				var citType = cit._octaneType.split('.').pop();

				path = citType + 'Type_' + citType + '-' + cit._getId() + '_' 
					+ shorthand.constants.TRANSFORM;
			} else if (citizen instanceof hemi.Viewpoint && config.parent) {
				cit = config.parent.citizen;
				path = config.parent._octaneType.split('.').pop() + '_' + 
					cit._octaneType.split('.').pop() + '-' + cit._getId();
			} else if (citizen._octaneType === shorthand.constants.CAM_MOVE ||
					citizen._octaneType === shorthand.constants.SHAPE_PICK ||
					citizen._octaneType === shorthand.constants.TRANSFORM) {
				cit = citizen.citizen;
				path =  citizen._octaneType.split('.').pop();
				type = cit._octaneType.split('.').pop();
				id = cit._getId();
			} 
			nodeName += (path !== null ? path + '_' : '') + type + (id !== null ? '-' + id : '');
		} else if ((typeof citizen) === 'string') {
			nodeName += citizen;
		}
		
		if (config.option != null) {
			nodeName += '_' + config.option;
		}
		
		return nodeName.replace(' ', '-').replace('.', '-');
	}
	
	function getNodePath(nodeName) {
		var ndx = nodeName.indexOf('_'),
			names = [];
		
		ndx = nodeName.indexOf('_', ndx + 1);
		
		while (ndx > -1) {
			names.push(nodeName.substr(0, ndx));
			ndx = nodeName.indexOf('_', ndx + 1);
		}
		
		return names;
	}
	
	function createCitizenJson(citizen, prefix, opt_parent) {
		var name = getNodeName(citizen, {
			option: null,
			prefix: prefix
		});
		
		return {
			data: citizen.name || '',
			attr: {
				id: name,
				rel: 'citizen'
			},
			metadata: {
				type: 'citizen',
				citizen: citizen
			}
		};
	}
	
	function createShapeTransformJson(shape, node, prefix, method) {
		owners.put(shape.mesh, shape);
		
		node.children.push({
			data: 'transforms',
			attr: {
				id: getNodeName(shape, {
					option: shorthand.constants.TRANSFORM,
					prefix: prefix
				}),
				rel: 'other'
			},
			children: [shorthand.treeData[method](shape.mesh, prefix)],
			state: 'closed',
			metadata: {
				type: 'set'
			}
		});
	}
	
	function createModelTransformJson(model, node, prefix, method) {
		var list = [],
			transforms = [];
		
		THREE.SceneUtils.traverseHierarchy(model.root, function(transform) {
			list.push(transform);
			owners.put(transform, model);
		});
		
		for (var ndx = 0, len = list.length; ndx < len; ndx++) {
			transforms.push(shorthand.treeData[method](list[ndx], prefix));
		}
		
		node.children.push({
			data: 'transforms',
			attr: {
				id: getNodeName(model, {
					option: shorthand.constants.TRANSFORM,
					prefix: prefix
				}),
				rel: 'other'
			},
			children: transforms,
			state: 'closed',
			metadata: {
				type: 'set'
			}
		});
	}
	
	shorthand.treeData.getNodeName = getNodeName;
	shorthand.treeData.getNodePath = getNodePath;
	shorthand.treeData.createCitizenJson = createCitizenJson;
	shorthand.treeData.isCommon = isCommon;
	
	shorthand.treeData.createShapePickCitizen = function(model) {
		return {
			shapePick: true,
			name: 'Picked Shape:',
			citizen: model,
			_octaneType: shorthand.constants.SHAPE_PICK,
			_getId: function() {
				return this.citizen._getId();
			}
		};
	};
	
	shorthand.treeData.createTransformCitizen = function(model) {
		return {
			isTransform: true,
			name: 'Transforms',
			citizen: model,
			_octaneType: shorthand.constants.TRANSFORM,
			_getId: function() {
				return this.citizen._getId();
			}
		};
	};
	
	shorthand.treeData.createCamMoveCitizen = function(camera) {
		return {
			camMove: true,
			name: 'Camera Move:',
			citizen: camera,
			_octaneType: shorthand.constants.CAM_MOVE,
			_getId: function() {
				return this.citizen._getId();
			}
		};
	};
	
	shorthand.treeData.createOctaneTypeJson = function(citizen, prefix) {
		var type = citizen._octaneType.split('.').pop(),
			name = getNodeName(type + 'Type', {
				option: null,
				prefix: prefix
			});
		
		return {
			data: type,
			attr: {
				id: name,
				rel: 'citType'
			},
			state: 'closed',
			children: [],
			metadata: {
				type: 'citType'
			}
		};
	};
	
	shorthand.treeData.createTriggerJson = function(citizen, prefix) {
		var id = citizen._getId(),
			name = getNodeName(citizen, {
				option: MSG_WILDCARD,
				prefix: prefix
			}),
			msgs = [{
				data: '[any trigger]',
				attr: {
					id: name,
					rel: 'message'
				},
				metadata: {
					type: 'message',
					parent: citizen,
					msg: MSG_WILDCARD
				}
			}],
			children = [{
				data: 'messages',
				attr: {
					id: getNodeName(citizen, {
						option: shorthand.constants.MESSAGES,
						prefix: prefix
					}),
					rel: 'other'
				},
				metadata: {
					type: 'set'
				},
				children: msgs
			}],
			msgSent = citizen._msgSent;
		
		for (var ndx = 0, len = msgSent ? msgSent.length : 0; ndx < len; ndx++) {
			var msg = msgSent[ndx];
			name = getNodeName(citizen, {
				option: msg,
				prefix: prefix
			});
			
			msgs.push({
				data: msg.split('.').pop(),
				attr: {
					id: name,
					rel: 'message'
				},
				metadata: {
					type: 'message',
					parent: citizen,
					msg: msg
				}
			});
		}
		
		var node = createCitizenJson(citizen, prefix);
		node.children = children;
		node.state = 'closed';
		return node;
	};
	
	shorthand.treeData.createActionJson = function(citizen, prefix) {
		var id = citizen._getId(),
			fcnPre = shorthand.constants.FUNCTIONS,
			fcnMorePre = shorthand.constants.FUNCTIONS_MORE,
			functions = {
				data: 'functions',
				attr: {
					id: getNodeName(citizen, {
						option: fcnPre,
						prefix: prefix
					}),
					rel: 'other'
				},
				metadata: {
					type: 'set'
				}
			},
			methods = [],
			moreMethods = [],
			node;
		
		for (var propName in citizen) {
			var prop = citizen[propName];
			
			if (jQuery.isFunction(prop) && methodsToRemove.indexOf(propName) === -1) {
				var common = isCommon(citizen, propName),
					name = getNodeName(citizen, {
						option: common ? fcnPre + '_' + propName : fcnMorePre + 
							propName,
						prefix: prefix
					});

				node = {
					data: propName,
					attr: {
						id: name,
						rel: 'method'
					},
					metadata: {
						type: 'method',
						parent: citizen
					}
				};
				
				if (common) {
					methods.push(node);
				} else {
					moreMethods.push(node);
				}
			}
		}
		
		if (methods.length > 0) {
			var moreName = getNodeName(citizen, {
					option: fcnMorePre,
					prefix: prefix
				});
			var moreNode = {
				data: 'More...',
				attr: {
					id: moreName,
					rel: 'other'
				},
				state: 'closed',
				children: moreMethods,
				metadata: {
					type: 'citType'
				}
			};
			methods.push(moreNode);
		} else {
			methods = moreMethods;

			for (var i = 0, il = methods.length; i < il; i++) {
				var temp = methods[i];
				temp.attr.id = temp.attr.id.replace('MORE_', '');
			}
		}
		
		functions.children = methods;
		node = createCitizenJson(citizen, prefix);
		node.children = [functions];
		node.state = 'closed';
		return node;
	};
	
	shorthand.treeData.createCamMoveJson = function(cmCit, prefix) {
		var camera = cmCit.citizen,
			viewpoints = hemi.world.getViewpoints(),
			nodes = [];
		
		for (var ndx = 0, len = viewpoints.length; ndx < len; ndx++) {
			var node = shorthand.treeData.createViewpointJson(cmCit,
					viewpoints[ndx], prefix);
			nodes.push(node);
		}
		
		var name = getNodeName(cmCit, {
			option: null,
			prefix: prefix
		});
		
		return {
			data: camera.name || '',
			attr: {
				id: name,
				rel: 'citizen'
			},
			children: nodes,
			state: 'closed',
			metadata: {
				type: 'citizen',
				citizen: cmCit
			}
		};
	};
	
	shorthand.treeData.createCamMoveTypeJson = function(cmCit, prefix) {
		var name = getNodeName(cmCit._octaneType, {
			option: null,
			prefix: prefix
		});
		
		return {
			data: 'Camera Move',
			attr: {
				id: name,
				rel: 'citType'
			},
			state: 'closed',
			children: [],
			metadata: {
				type: 'citType'
			}
		};
	};
	
	shorthand.treeData.createViewpointJson = function(cmCit, viewpoint, prefix) {
		var name = getNodeName(viewpoint, {
				prefix: prefix,
				parent: cmCit
			});
			
		return {
			data: viewpoint.name || '',
			attr: {
				id: name,
				rel: 'message'
			},
			metadata: {
				type: 'message',
				parent: cmCit,
				msg: viewpoint._getId()
			}
		};
	};
	
	shorthand.treeData.createModelPickJson = function(model, node, prefix) {
		var spCit = shorthand.treeData.createShapePickCitizen(model),
			id = model._getId(),
			meshes = [],
			meshJson = [],
			pre = shorthand.constants.SHAPE_PICK,
			name;

		findMeshes(model.root, meshes);

		for (var i = 0, il = meshes.length; i < il; ++i) {
			var mesh = meshes[i];
			name = getNodeName(model, {
				option: pre + '_' + mesh.name.replace(/_/g, '-') || '',
				prefix: prefix
			});

			meshJson.push({
				data: mesh.name || '',
				attr: {
					id: name,
					rel: 'message'
				},
				metadata: {
					type: 'message',
					parent: spCit,
					msg: mesh.name || ''
				}
			});
		}

		node.children.push({
			data: 'pickable shapes',
			attr: {
				id: getNodeName(model, {
					option: pre,
					prefix: prefix
				}),
				rel: 'other'
			},
			metadata: {
				type: 'set'
			},
			children: meshJson
		});
	};
	
	shorthand.treeData.createModelTransformTriggerJson = function(model, node, prefix) {
		return createModelTransformJson(model, node, prefix, 'createTriggerJson');
	};
	
	shorthand.treeData.createModelTransformActionJson = function(model, node, prefix) {
		return createModelTransformJson(model, node, prefix, 'createActionJson');
	};
	
	shorthand.treeData.createShapePickJson = function(shape, node, prefix) {
		var spCit = shorthand.treeData.createShapePickCitizen(shape),
			id = shape._getId(),
			pre = shorthand.constants.SHAPE_PICK,
			children = [{
				data: shape.name || '',
				attr: {
					id: getNodeName(shape, {
						option: pre + '_' + shape.name.replace(/_/g, '-') || '',
						prefix: prefix
					}),
					rel: 'message'
				},
				metadata: {
					type: 'message',
					parent: spCit,
					msg: shape.mesh.name || ''
				}
			}];
		
		node.children.push({
			data: 'pickable shapes',
			attr: {
				id: getNodeName(shape, {
					option: pre,
					prefix: prefix
				}),
				rel: 'other'
			},
			metadata: {
				type: 'set'
			},
			children: children
		});
	};
	
	shorthand.treeData.createShapeTransformTriggerJson = function(shape, node, prefix) {
		return createShapeTransformJson(shape, node, prefix, 'createTriggerJson');
	};
	
	shorthand.treeData.createShapeTransformActionJson = function(shape, node, prefix) {
		return createShapeTransformJson(shape, node, prefix, 'createActionJson');
	};
	
	shorthand.treeData.createShapePickTypeJson = function(spCit, prefix) {
		var name = getNodeName(spCit._octaneType, {
			option: null,
			prefix: prefix
		});
		
		return {
			data: 'Picked Shape',
			attr: {
				id: name,
				rel: 'citType'
			},
			state: 'closed',
			children: [],
			metadata: {
				type: 'citType'
			}
		};
	};
	
	shorthand.treeData.createTransformTypeJson = function(tCit, prefix) {
		var name = getNodeName(tCit._octaneType, {
			option: null,
			prefix: prefix
		});
		
		return {
			data: 'Transforms',
			attr: {
				id: name,
				rel: 'citType'
			},
			state: 'closed',
			children: [],
			metadata: {
				type: 'citType'
			}
		};
	};
	
	shorthand.treeData.createWildcardJson = function(prefix) {
		var name = getNodeName(MSG_WILDCARD, {
				option: MSG_WILDCARD,
				prefix: prefix
			}),
			msgs = [{
				data: '[any trigger]',
				attr: {
					id: name,
					rel: 'message'
				},
				metadata: {
					type: 'message',
					parent: MSG_WILDCARD,
					msg: MSG_WILDCARD
				}
			}];
		
		for (var ndx in hemi.msg) {
			var msg = hemi.msg[ndx];
			
			if (!jQuery.isFunction(msg)) {
				name = getNodeName(MSG_WILDCARD, {
					option: msg,
					prefix: prefix
				});
				
				msgs.push({
					data: msg.split('.').pop(),
					attr: {
						id: name,
						rel: 'message'
					},
					metadata: {
						type: 'message',
						parent: MSG_WILDCARD,
						msg: msg
					}
				});
			}
		}
		
		name = getNodeName(MSG_WILDCARD, {
			option: null,
			prefix: prefix
		});
		
		return {
			data: '[Any source]',
			attr: {
				id: name,
				rel: 'citizen'
			},
			state: 'closed',
			children: msgs,
			metadata: {
				type: 'citizen',
				citizen: MSG_WILDCARD
			}
		};
	};

	shorthand.treeData.cleanup = function() {
		owners.clear();
	};

	shorthand.treeData.getOwner = function(citizen) {
		return owners.get(citizen);
	};

	shorthand.treeData.removeOwner = function(citizen) {
		owners.remove(citizen);
	};

	function findMeshes(transform, meshes) {
		var children = transform.children;

		if (transform.geometry) {
			meshes.push(transform);
		}

		for (var i = 0, il = children.length; i < il; ++i) {
			findMeshes(children[i], meshes);
		}
	}

})();