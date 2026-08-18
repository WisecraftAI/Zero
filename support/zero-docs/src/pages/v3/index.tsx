import { Repos } from './sections/Repos';
import { Sequence } from './sections/Sequence';
import { Docker } from './sections/Docker';
import { PerApp } from './sections/PerApp';
import { Smell } from './sections/Smell';
import { Tests } from './sections/Tests';
import { Best } from './sections/Best';
import { CrossCutting } from './sections/CrossCutting';
import { Risks } from './sections/Risks';

export function V3Page() {
  return (
    <>
      <Repos />
      <Sequence />
      <PerApp />
      <Docker />
      <Smell />
      <Tests />
      <Best />
      <CrossCutting />
      <Risks />
    </>
  );
}
