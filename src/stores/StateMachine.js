

class State {
    constructor(options) {
        this.name = options.name;
        this.next = options.next;
        this.previous = options.previous;
        this.transition = options.transition;
        this.postTransition = options.postTransition
    }
}

class StateMachine {
    constructor(states) {
        this.states = states;
        this.state = this.states[0];

    }
    getState() {
        return this.state.name;
    }
}

/* --------------------------------- */

const myStates = [
    new State({
        name: 'off',
        next: 'on',
        previous: false,
        transition: function start() {
            console.log(`${this.name} -> ${this.next}`);
        },
        postTransition: function started() {
            console.log('Started');
        }
    }),
    new State({
        name: "on",
        next: 'ending',
        previous: 'off',
        transition: function on() {
            console.log(`${this.name} -> ${this.next}`);
        },
        postTransition: function ending() {
            console.log('Ending');
        }
    }),
    new State({
        name: "ending",
        next: 'off',
        previous: 'on',
        transition: function shuttingOff() {
            console.log(`${this.name} -> ${this.next}`);
        },
        postTransition: function off() {
            console.log('Off');
        }
    })
];

let fsm = new StateMachine(myStates);

