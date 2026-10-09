export default function ProjectCard({ project, index }) {
  const ImageFrame = project.url ? "a" : "div";
  return (
    <article className="project-card" id={project.id || undefined}>
      <ImageFrame
        className={`project-image ${project.imageClass}`}
        href={project.url || undefined}
        target={project.url ? "_blank" : undefined}
        rel={project.url ? "noopener noreferrer" : undefined}
        aria-label={project.imageLabel || undefined}
      >
        <img
          src={project.image}
          alt={project.alt}
          width={project.width}
          height={project.height}
          loading="lazy"
          decoding="async"
        />
        <span className="project-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")} / {project.category}
        </span>
        {project.url && (
          <span className="project-open-icon" aria-hidden="true">
            ↗
          </span>
        )}
      </ImageFrame>
      <div className="project-heading">
        <h3>{project.title}</h3>
        <span className="project-kind">{project.kind}</span>
      </div>
      <p>{project.description}</p>
      <ul
        className="project-tags flex flex-wrap list-none gap-x-[18px] gap-y-[8px] m-0 mt-[19px] p-0"
        aria-label="Project capabilities"
      >
        {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      {project.url && (
        <a
          className="project-visit"
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit website <span aria-hidden="true">↗</span>
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}
