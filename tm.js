const yaml = require('js-yaml');
const fs = require('fs');

class State {
    transitions = {};
    name = '';
}

class TuringMachine {
    tape = [];
    states = [];
    head = 0;
    state = 0;

    acceptingStates = [];
    initState = 0;

    emptyChar = ' ';

    halt = false;

    constructor(emptyChar = ' ') {
        this.emptyChar = emptyChar;
    }

    addState(state) {
        this.states.push(state);
    }

    setInitialState(state) {
        let found = false;
        for (const s of this.states) {
            if (s.name === state) {
                this.state = this.states.indexOf(s);
                this.initState = this.states.indexOf(s);
                found = true;
                break;
            }
        }
        if (!found) {
            console.log(`State ${state} used in initial states not found, exiting...`);
            process.exit(1);
        }
    }

    setAcceptingStates(states) {
        for (const s of states) {
            let found = false;
            for (const state of this.states) {
                if (state.name === s) {
                    this.acceptingStates.push(this.states.indexOf(state));
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(`State ${s} used in accepting states not found, exiting...`);
                process.exit(1);
            }
        }
    }

    loadTape(str) {
        for (const char of str) {
            this.tape.push(char);
        }
    }

    sanityCheck() {
        let states = []
        for (const s of this.states) {
            states.push(s.name);
        }
        for (const s of this.states) {
            for (const t in s.transitions) {
                if (s.transitions[t].next && !states.includes(s.transitions[t].next)) {
                    console.log(`State ${s.transitions[t].next} used in ${s.name} not found, exiting...`);
                    process.exit(1);
                }
            }
        }
    }

    step() {
        const s = this.states[this.state];
        if (s.transitions.hasOwnProperty(this.tape[this.head])) {
            const transition = s.transitions[this.tape[this.head]];
            if ("write" in transition)
                this.tape[this.head] = transition.write;
            if (transition.move == -100)
                this.head = 0;
            else
                this.head += transition.move;
            for (const state of this.states) {
                if (state.name === transition.next) {
                    this.state = this.states.indexOf(state);
                    break;
                }
            }
            if (this.head < 0) {
                this.tape.unshift(this.emptyChar);
                this.head = 0;
            }
            if (this.head >= this.tape.length) {
                this.tape.push(this.emptyChar);
            }
        } else {
            this.halt = true;
        }
    }

    printTape(padSize = 0) {
        console.log(this.tape.join('') + "    @" + this.states[this.state].name + " ".repeat(padSize));
        console.log(' '.repeat(this.head) + '^' + " ".repeat(padSize));
    }

    isAccepting() {
        return this.acceptingStates.includes(this.state);
    }
    runWithSteps(delay = 1000) {
        console.log('\x1Bc');
        let runInterval = setInterval(() => {
            this.step();
            this.printTape(20);
            console.log(`\u001b[${0};${0}H`);
            if (this.halt) {
                clearInterval(runInterval);
                this.printTape(20);
                return;
            }
        }, delay);
        console.log("\n")
    }
    genMoveToRight(appendHead, alphabet, startState) {
        let s = new State();
        s.name = "tyr1";
        s.transitions = {};
        for (const alpha of alphabet) {
            s.transitions[alpha] = { move: 1, next: "tyr11" }
        }
        s.transitions[this.emptyChar] = { move: 1, next: "tyre" }
        this.states.push(s);

        s = new State();
        s.name = "tyr11";
        s.transitions = {};
        for (const alpha of alphabet) {
            s.transitions[alpha] = { move: 1, next: "tyr11" }
        }
        s.transitions[this.emptyChar] = { move: -1, next: "tyr2" }
        this.states.push(s);

        s = new State();
        s.name = "tyr2";
        s.transitions = {};
        for (const alpha of alphabet) {
            s.transitions[alpha] = { move: 1, write: this.emptyChar, next: `tyr3${alpha}0` }
        }
        this.states.push(s);
        // add dummy
        for (let i = 0; i < appendHead; i++) {
            for (const alpha of alphabet) {
                s = new State();
                s.name = `tyr3${alpha}${i}`;
                s.transitions = {};
                for (const alpha1 of alphabet) {
                    s.transitions[alpha1] = { move: 1, next: `tyr3${alpha}${i + 1}` }
                }
                s.transitions[this.emptyChar] = { move: 1, next: `tyr3${alpha}${i + 1}` }
                this.states.push(s);
            }
        }

        for (const alpha of alphabet) {
            s = new State();
            s.name = `tyr3${alpha}${appendHead}`;
            s.transitions = {};
            s.transitions[this.emptyChar] = { move: -100, write: alpha, next: "tyr1" }
            this.states.push(s);
        }

        s = new State();
        s.name = "tyre";
        s.transitions = {};
        s.transitions[this.emptyChar] = { move: 1, next: "tyre" }
        for (const alpha of alphabet) {
            s.transitions[alpha] = { move: -1, next: "tyre2" }
        }
        this.states.push(s);

        s = new State();
        s.name = "tyre2";
        s.transitions = {};
        for (const alpha of alphabet) {
            s.transitions[alpha] = { move: 1, next: startState }
        }
        s.transitions[this.emptyChar] = { move: 1, next: startState }
        this.states.push(s);

        this.setInitialState("tyr1")
        // pure mentor magic
        let mentorStates = `tyr1 ({${alphabet.join(",")}}->.,R tyr11) (_->.,R tyre)\n`
        mentorStates += `tyr11 ({${alphabet.join(",")}}->.,R tyr11) (_->.,L tyr2)\n`
        mentorStates += `tyr2 `

        // Store alpha in state, move to dummy state
        for (const alpha of alphabet) {
            mentorStates += `(${alpha}->_,R tyr3${alpha}0) `
        }
        mentorStates += "\n"

        // Add dummy states that moves right
        for (let i = 0; i < appendHead; i++)
            for (const alpha of alphabet) {
                mentorStates += `tyr3${alpha}${i} (.->.,R tyr3${alpha}${i + 1})\n`
            }

        // Paste the original char
        for (const alpha of alphabet) {
            mentorStates += `tyr3${alpha}${appendHead} (.->${alpha},S tyr1)\n`
        }
        mentorStates += `tyre (_->., R tyre) ({${alphabet.join(",")}}->.,L tyre2)\n`
        mentorStates += `tyre2 (.->., R ${startState})\n`
        return ""
    }
    // appendHead: number, if given, will move the input string to the right by that many characters
    convertToMentor(appendHead) {
        let alphabet = [];
        for (const state of this.states)
            for (const transition in state.transitions)
                if (!alphabet.includes(transition))
                    alphabet.push(transition);
        if (alphabet.includes(this.emptyChar)) {
            alphabet.splice(alphabet.indexOf(this.emptyChar), 1);
        }
        let mentorHeader
        let mentorStates = "";
        if (appendHead) {
            mentorHeader = `alphabet: {${alphabet.join(",")}}\nstart: tyr1\n`
            mentorStates += this.genMoveToRight(appendHead, alphabet, this.states[this.initState].name)
        }
        else
            mentorHeader = `alphabet: {${alphabet.join(",")}}\nstart: ${this.states[this.initState].name}\n`

        for (const state of this.states) {
            mentorStates += `${state.name} `
            let mentorTransitions = ""
            for (const transition in state.transitions) {
                let t = state.transitions[transition];
                let move = (t.move === 1) ? "R" : "L";
                let write = (t.write) ? t.write : ".";
                let trs = (transition === this.emptyChar) ? "_" : transition
                write = (write === this.emptyChar) ? "_" : write;
                mentorTransitions += `(${trs} -> ${write},${move} ${t.next ? t.next : state.name}) `
            }
            mentorStates += mentorTransitions + "\n"
        }

        console.log(mentorHeader + mentorStates)
    }
}

function main() {
    const file = process.argv[2];
    // Start parsing yaml file
    let content = '';
    try {
        content = yaml.load(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        console.log(error);
    }
    let blank = ' '
    if (!content.blank)
        console.log('No blank character specified, using default');
    else
        blank = content.blank;
    let tm = new TuringMachine(blank);
    if (!content.table) {
        console.log('No transitions specified, exiting...');
        process.exit(1);
    }
    for (const state in content.table) {
        let curr = content.table[state];
        let s = new State();
        s.name = state;
        for (const tarr in curr) {
            let trans = tarr.split(',');
            let transition = {};
            if (typeof (curr[tarr]) == "string") {
                if (!["L", "R"].includes(curr[tarr])) {
                    console.log(`Invalid move direction for state ${state}, exiting...`);
                    process.exit(1);
                }
                transition.move = (curr[tarr] === "L") ? -1 : 1;
            } else {
                if ("R" in curr[tarr]) {
                    transition.move = 1;
                    transition.next = curr[tarr].R;
                }
                else if ("L" in curr[tarr]) {
                    transition.move = -1;
                    transition.next = curr[tarr].L;
                }
                else {
                    console.log(`Invalid move direction for state ${state}, exiting...`);
                    process.exit(1);
                }
                if ("write" in curr[tarr]) {
                    transition.write = curr[tarr].write;
                }
            }
            for (const t of trans) {
                s.transitions[t] = transition;
            }
        }
        // console.log(curr, s)
        tm.addState(s);
    }

    if (!("start state" in content)) {
        console.log('No initial state specified, exiting...');
        process.exit(1);
    }
    if (!("accept states" in content))
        console.log('Warning: No accepting states specified');
    else {
        if (typeof (content["accept state"]) !== "object")
            tm.setAcceptingStates([content["accept state"]]);
        else
            tm.setAcceptingStates(content["accept state"]);
    }

    tm.setInitialState(content["start state"]);
    tm.sanityCheck();

    // Finished parsing

    // this is how you give it a input
    tm.loadTape("11;10");


    // This should give the mentor representation of this machine
    console.log(tm.convertToMentor(1))

    // This is how you run it
    // tm.runWithSteps(500);


    if (tm.isAccepting())
        console.log('Accepted');
    else
        console.log('Rejected');
}

main();
