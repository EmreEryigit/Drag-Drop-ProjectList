// DRAG AND DROP

interface Draggable {
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
}
interface DragTarget {
    dragOverHandler(event: DragEvent): void;
    dropHandler(event: DragEvent): void;
    dragLeaveHandler(event: DragEvent): void;
}


// Project Type
enum Status {
    active,
    finished
}

class Project {
    constructor(
        public id: string,
        public title: string,
        public desc: string,
        public people: number,
        public status: Status
    ) { }
}

// STATE MANAGEMENT
type Listener<T> = (items: T[]) => void;

class State<T> {   
    protected listeners: Listener<T>[] = []
    addListener(fn: Listener<T>) {
        this.listeners.push(fn)
    }

}
class ProjectState extends State <Project>{
    private projects: Project[] = []
    private static instance: ProjectState
    private constructor() { 
        super()
    }
    static getInstance() {
        if (this.instance) {
            return this.instance
        }
        this.instance = new ProjectState()
        return this.instance
    }

  

    addProject(title: string, desc: string, numofPeople: number) {
        const newProject = new Project(
            Math.random().toString(),
            title,
            desc,
            numofPeople,
            Status.active
        )
        this.projects.push(newProject)
        this.UpdateListeners()
        
    }

    moveProject(projectId: string, newStatus: Status) {
        const project = this.projects.find(prj => prj.id === projectId)
        if(project && project.status !== newStatus) {
            project.status = newStatus
            this.UpdateListeners()
        }
    }

    private UpdateListeners() {
        for (const listener of this.listeners) {
            listener(this.projects.slice())
        }
    }
}

const projectState = ProjectState.getInstance()


interface Validatable {
    value: string | number;
    required?: boolean;
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
}

function validate(validatableInput: Validatable) {
    let isValid = true
    if (validatableInput.required) {
        isValid = isValid && validatableInput.value.toString().trim().length !== 0
    }
    if (validatableInput.minLength != null && typeof validatableInput.value === "string") {
        isValid = isValid && validatableInput.value.length >= validatableInput.minLength
    }
    if (validatableInput.maxLength != null && typeof validatableInput.value === "string") {
        isValid = isValid && validatableInput.value.length <= validatableInput.maxLength
    }
    if (validatableInput.min != null && typeof validatableInput.value === "number") {
        isValid = isValid && validatableInput.value >= validatableInput.min
    }
    if (validatableInput.max != null && typeof validatableInput.value === "number") {
        isValid = isValid && validatableInput.value <= validatableInput.max
    }
    return isValid;
}

function AutoBind(_: any, _2: string, desc: PropertyDescriptor) {
    const org = desc.value
    const adjDesc: PropertyDescriptor = {
        configurable: true,
        enumerable: false,
        get() {
            const boundFn = org.bind(this)
            return boundFn
        }
    }
    return adjDesc
}

//  LIST CLASS

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement
    hostElement: T
    element: U

    constructor(templateId: string, hostElementId: string, insertAtStart: boolean, newElementId?: string) {
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement
        this.hostElement = document.getElementById(hostElementId)! as T

        const importNode = document.importNode(this.templateElement.content, true)
        this.element = importNode.firstElementChild as U;
        if (newElementId) {
            this.element.id = newElementId
        }
        this.attach(insertAtStart)
    }

    private attach(insertAtbegin: boolean) {
        this.hostElement.insertAdjacentElement(insertAtbegin ? "afterbegin" : "beforeend", this.element)
    }

    abstract configure(): void;
    abstract renderContent(): void;
}

// ITEM 
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
    private project: Project;

    get persons() {
        if(this.project.people === 1){
            return "1 person"
        } else {
            return `${this.project.people} people`
        }
    }
    constructor(hostId: string, project: Project) {
        super("single-project", hostId, false,project.id )
        this.project = project

        this.configure()
        this.renderContent()
    }
    configure(): void {
        this.element.addEventListener("dragstart", this.dragStartHandler)
    }

    renderContent(): void {
        this.element.querySelector("h2")!.textContent = this.project.title
        this.element.querySelector("h3")!.textContent = this.persons + " assigned"
        this.element.querySelector("p")!.textContent = this.project.desc   
    }
    @AutoBind
    dragStartHandler(event: DragEvent): void {
        event.dataTransfer!.setData("text/plain", this.project.id)
        event.dataTransfer!.effectAllowed = "move"
    }
    dragEndHandler(event: DragEvent): void {
        console.log(event);
        
    }

}
/// PROJECT LIST

class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget{

    assignedProjects: Project[]

    constructor(private type: "active" | "finished") {
        super("project-list", "app", false, `${type}-projects`)

        this.assignedProjects = []


        this.configure()
        this.renderContent()
    }

    private renderProjects() {
        const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement
        listEl.innerHTML = ""
        for (const projItem of this.assignedProjects) {
            new ProjectItem(this.element.querySelector("ul")!.id, projItem)
        }
    }
    @AutoBind
    dragOverHandler(event: DragEvent): void {
        if(event.dataTransfer && event.dataTransfer.types[0] === "text/plain"){
            event.preventDefault()
            const listEl = this.element.querySelector("ul")!
            listEl.classList.add("droppable")
        }
    }
    @AutoBind
    dropHandler(event: DragEvent): void {
        const prjId = event.dataTransfer!.getData("text/plain")
        projectState.moveProject(prjId,this.type === "active" ? Status.active : Status.finished )
    }
    @AutoBind
    dragLeaveHandler(event: DragEvent): void {
        const listEl = this.element.querySelector("ul")!
        listEl.classList.remove("droppable")
    }
    configure(): void {
        this.element.addEventListener("dragover", this.dragOverHandler)
        this.element.addEventListener("dragleave", this.dragLeaveHandler)
        this.element.addEventListener("drop", this.dropHandler)
        projectState.addListener((projects: Project[]) => {
            const relevantProjects = projects.filter(prj => {
                if (this.type === "active") {
                    return prj.status === Status.active
                } else {
                    return prj.status === Status.finished
                }
            })
            this.assignedProjects = relevantProjects
            this.renderProjects()
        })
    }

    renderContent() {
        const listId = `${this.type}-projects-list`
        this.element.querySelector("ul")!.id = listId
        this.element.querySelector("h2")!.textContent = this.type.toUpperCase() + " PROJECTS"
    }

}


// PROJECT INPUT CLASS
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement>{

    titleInputElement: HTMLInputElement
    peopleInputElement: HTMLInputElement
    descInputElement: HTMLInputElement
    constructor() {
        super("project-input", "app", true, "user-input")
        this.titleInputElement = this.element.querySelector("#title") as HTMLInputElement
        this.peopleInputElement = this.element.querySelector("#people") as HTMLInputElement
        this.descInputElement = this.element.querySelector("#description") as HTMLInputElement
        this.configure()
    }
    configure() {
        this.element.addEventListener("submit", this.submitHandler)
    }

    renderContent(): void {}
    private clearInputs() {
        this.titleInputElement.value = ""
        this.descInputElement.value = ""
        this.peopleInputElement.value = ""
    }
    @AutoBind
    private submitHandler(event: Event) {
        event.preventDefault()
        const userInput = this.gatherUserInput()
        if (Array.isArray(userInput)) {
            const [title, desc, people] = userInput
            projectState.addProject(title, desc, people)
            this.clearInputs()

        }
    }
    private gatherUserInput(): [string, string, number] | void {
        const enteredTitle = this.titleInputElement.value
        const enteredPeople = this.peopleInputElement.value
        const enteredDesc = this.descInputElement.value

        const titleValidateble: Validatable = {
            value: enteredTitle,
            required: true
        }
        const descValidateble: Validatable = {
            value: enteredDesc,
            required: true,
            minLength: 5

        }
        const peopleValidateble: Validatable = {
            value: +enteredPeople,
            required: true,
            min: 1,
            max: 5
        }
        if (
            validate(titleValidateble) &&
            validate(descValidateble) &&
            validate(peopleValidateble)) {
            return [enteredTitle, enteredDesc, +enteredPeople]
        } else {

            alert("invalid input")
            return
        }
    }


}
const proj = new ProjectInput()
const actList = new ProjectList("active")
const finishedList = new ProjectList("finished")



