import { projects } from "../data/projects";
import ProjectCard from "./ProjectCard";
export default function Projects() {
  return (
    <section
      className="projects-section section-pad"
      id="projects"
      aria-labelledby="projects-title"
    >
      <div className="section-top flex items-center justify-between gap-[24px]">
        <span className="eyebrow">03 / Selected projects</span>
        <span className="eyebrow">Web / Data / Automation</span>
      </div>
      <div className="section-heading flex items-end justify-between gap-[60px]">
        <h2 className="display-title" id="projects-title">
          Ideas in action.
          <br />
          <em>A selection of work.</em>
        </h2>
        <p className="project-disclaimer">
          A closer look at the websites and tools I build.
          <br />
          More projects on the way.
        </p>
      </div>
      <div className="projects-grid grid grid-cols-2 gap-x-[32px] gap-y-[64px]">
        {projects.map((project, index) => (
          <ProjectCard key={project.title} project={project} index={index} />
        ))}
      </div>
      <div className="projects-bottom">
        <p>Have something similar in mind?</p>
        <a className="text-link" href="#contact">
          Let’s discuss your project <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
