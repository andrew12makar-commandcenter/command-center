import {runBenchmarkCorpus} from '../lib/generator-benchmarks.ts';

const results=runBenchmarkCorpus();
console.table(results.map(({id,vertical,holdout,composition,score,accepted})=>({id,vertical,holdout,composition,score,accepted})));
if(results.some(x=>!x.accepted)){
 console.error(JSON.stringify(results.filter(x=>!x.accepted),null,2));
 process.exitCode=1;
}
