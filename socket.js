// (function(window) {

// })(window);

/*
	----- Algumas regras:
	[1] para um cildren de um entidade poder ser filtrado a entidade filha tem que ter 
	atributo chamado _[entidade pai]_id.
	Assim, se eu quiser receber todas as alterações de slides de um sco especifico 
	os slides tem que ter um atributo _sco_id igual o _id do pai.

	[2] se nada for comunicado o evento de resposta nunca é acionado


	---- Observações:
	{1} Preencher como logica de emissão de eventos do socket

	{2} Os eventos são disparados em todas as Room's

	{3} só funciona com engines de js que suportem ES5

	{4} Por enquanto não está funcionando a parte de filtragem para receber eventos só quando
		certos atributos mudarem. espero receber o modelo todo e só vou filtrar o que vai voltar.
		mas não está longe de funcionar


	---- Testes:
	slideRoom.event('notes', 'change', {_id:12345, name: 'asd', order: 2, _slide_id: 102983});
	- notas de um determinado slide. Mudando o _slide_id não emit nada
	- Se no subscribe não tiver o id do slide qualquer nota é notificada 

	scoRoom.event('slides', 'change', {_id:12345, name: 'asd', order: 2, _sco_id: 123});
	- slides de um sco especifico
	- Se no subscribe não tiver o id do sco qualquer slide é notificado



*/

var Room = function(entity) {
	this.entity = entity;
	this.listeners = [];
	this.toEmit = [];

	var checkEventData = function(events, type) {
		var eventData = _.where(events, {
			type: type
		});

		return eventData.length === 1 ? eventData[0] : false;
	}

	var checkAttr = function(data, keys) {
		var changedKeys = _.keys(data),
			intersec = _.intersection(changedKeys, keys);

		return intersec.length === 0 ? false : true;
	}

	var pickData = function(data, callbackWith) {
		var data = _.pick(data, callbackWith);

		return Object.keys(data).length === 0 ? null : data; //{3}
	}

	this.check = function(listener, entity, type, data) {
		// console.log('check: ', listener, entity, type, data);

		if (listener.children) {
			for (var i = listener.children.length - 1; i >= 0; i--) {
				// console.log(listener._id, listener.entity, data['_' + listener.entity + '_id']);
				if (!listener._id || data['_' + listener.entity + '_id'] === listener._id) { // [1]
					this.check(listener.children[i], entity, type, data)
				}
			};
		}

		// console.log('check: ', listener._id, data._id, entity, listener.entity);
		// console.log('check: ', (typeof listener._id !== "undefined" || data._id === listener._id), entity !== listener.entity);
		if ((typeof listener._id === "undefined" || data._id === listener._id) && entity === listener.entity) {
			var events = listener.events,
				eventData = checkEventData(events, type),
				changedAttr = checkAttr(data, eventData.attr),
				callbackData = pickData(data, eventData.callbackWith);

			if (callbackData) {
				console.log('emit: ', this); //{1}
				this.toEmit.push({
					entity: entity,
					type: type,
					data: callbackData
				});
			}
		}
	}

	this.subscribe = function(subscriber) {
		this.listeners.push(subscriber);
	}

	this.event = function(entity, type, data) {
		var listeners = this.listeners;

		for (var i = listeners.length - 1; i >= 0; i--) {
			var listener = listeners[i];
			// talvez data tenho que ser um diff entre modelo antigo e novo
			// não sei o que fica melhor para você implementar mas lembro que
			// um dos dois caminhos ficava complicado para você			
			this.check(listener, entity, type, data);
			console.log('toEmit', this.toEmit);
		};
	};
}

//Exemplo de como um usuário se cadastraria para escutar todas as alterações dos slides de um SCO
var data = {
	entity: "sco",
	_id: 123,
	events: [
		{
			type: "change",
			attr: ["name"],
			callbackWith: ["_id"]
		}
	],
	on: {
		success: "evento_de_sucesso",
		/* Eventos de sucesso de conexão sempre voltam uma lista de usuários que deram subscribe na mesma entidade */
		error: "evento_de_error",
		join: "evento_de_novo_usuario",
		leave: "evento_de_saida_usuario"
	},
	children: [
		{
			entity: "slides",
			events: [
				{
					type: "create",
					callbackWith: ["_id", "order"]
				},
				{
					type: "change", //change unico com tratamento especifico que pode se registrar em mudanças especifias e em caso de attr undefined or null se registra em todas mudanças
					attr: ["name", "order", "updatedAt"],
					callbackWith: ["_id", "order"]
				},
				{
					type: "delete",
					callbackWith: ["_id"]
				}
			]
		}
	]
}

var data2 = {
	entity: "slide",
	_id: 102983,
	on: { // todo evento de resposta volta a entidade que o gerou
		success: "evento_de_sucesso",
		/* Eventos de sucesso de conexo sempre voltam um lista de usuários que deram subscribe na mesma entidade */
		error: "evento_de_error",
		login: "evento_de_novo_usuario",
		logout: "evento_de_saida_usuario"
	},
	children: [
		{
			entity: "resources",
			events: [
				{
					type: "create",
					callbackWith: ["_id", "order"]
				},
				{
					type: "change", //change unico com tratamento especifico que pode se registrar em mudanças especifias e em caso de attr undefined or null se registra em todas mudanças
					attr: ["name", "order", "updatedAt"],
					callbackWith: ["_id"]
				},
				{
					type: "delete",
					callbackWith: ["_id"]
				}
			]
		},

		{
			entity: "notes",
			events: [
				{
					type: "create",
					callbackWith: ["_id", "order"]
				},
				{
					type: "change",
					attr: ["name", "order", "updatedAt"],
					callbackWith: ["_id"]
				},
				{
					type: "delete",
					callbackWith: ["_id"]
				}
			]
		}
	]
}

var scoRoom = new Room('sco');
var slideRoom = new Room('slide');

scoRoom.subscribe(data);
slideRoom.subscribe(data2);