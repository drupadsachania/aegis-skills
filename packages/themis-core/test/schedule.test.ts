import { scheduleStage, readySubTasks } from '../src/schedule'
import type { SubTask } from '../src/types'

const st = (id: string, dependsOn: string[] = []): SubTask => ({ id, description: id, skill: 's', phase: 0, tier: 'fast', dependsOn })
const done = (...ids: string[]) => ids.map((subTaskId) => ({ subTaskId }))

it('dispatches only sub-tasks whose dependencies are complete', () => {
  expect(scheduleStage([st('a'), st('b', ['a'])], [])).toEqual({ kind: 'dispatch', ready: [st('a')] })
})
it('dispatches the dependant once its dependency has a result', () => {
  expect(scheduleStage([st('a'), st('b', ['a'])], done('a'))).toEqual({ kind: 'dispatch', ready: [st('b', ['a'])] })
})
it('runs independent tasks together', () => {
  expect((scheduleStage([st('a'), st('b')], []) as { ready: SubTask[] }).ready).toHaveLength(2)
})
it('releases every pending task when nothing is ready, so a malformed plan cannot stall', () => {
  expect(scheduleStage([st('a', ['b']), st('b', ['a'])], [])).toEqual({ kind: 'dispatch', ready: [st('a', ['b']), st('b', ['a'])] })
})
it('completes when every sub-task has a result (or the plan is empty)', () => {
  expect(scheduleStage([st('a')], done('a'))).toEqual({ kind: 'complete' })
  expect(scheduleStage([], [])).toEqual({ kind: 'complete' })
  expect(readySubTasks({ subTasks: [st('a')], results: done('a') })).toEqual([])
})
