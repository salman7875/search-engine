import type { RetrieveData } from "../../types/api.types";

const ResultItem = ({ result }: { result: RetrieveData }) => {
  return (
    <article className="flex flex-col items-start group">
      {/* <div className="flex items-center gap-2 mb-1.5 text-zinc-500 text-xs">
        <div className="w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-3 h-3 text-zinc-600" />
        </div>
        <span className="text-zinc-300">|</span>
        <span className="text-[11px] font-medium text-zinc-400">
          {result.updatedAt}
        </span>
      </div> */}

      <a
        href="#"
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-900 group-hover:text-zinc-600 font-semibold text-lg leading-tight tracking-tight transition-colors"
      >
        {result.title}
      </a>

      <p className="mt-2 text-sm text-zinc-600 leading-relaxed max-w-2xl">
        {result.snippet}
      </p>

      {/* {result.tags ? <ResultTag tags={result.tags} /> : null} */}
    </article>
  );
};

export default ResultItem;
