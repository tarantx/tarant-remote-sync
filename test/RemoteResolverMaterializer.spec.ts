jest.useFakeTimers();

const mockAxios = {
    post: jest.fn(),
    get: jest.fn()
}
jest.mock('axios', () => ({ __esModule: true, default: mockAxios }))

import { RemoteResolverMaterializer } from '../lib/RemoteResolverMaterializer'
import * as faker from 'faker'
import { Actor, ActorMessage } from 'tarant';

abstract class FakeActor {

}

describe('RemoteResolverMaterializer', () => {
    beforeEach(() => {
        mockAxios.post.mockReset()
        mockAxios.get.mockReset()
    }); 

  describe('as a Resolver', () => {
    it('should try retrieve actor from remote', async () => {
        const id = faker.random.uuid(),
          config = {
            sync: {
                active: true,
                delay: faker.random.number(1000)
            },
              paths: {
                  pull: faker.internet.url(), 
                  push: faker.internet.url(), 
              },
              ActorTypes: { FakeActor }
          },
          expectToJson = {
              data:{
                  type: "FakeActor",
                  random: faker.random.uuid() 
              }
            }
        mockAxios.get.mockResolvedValue(expectToJson)

          let local = new RemoteResolverMaterializer(config)
          let result : FakeActor = await local.resolveActorById(id)
          expect(mockAxios.get).toHaveBeenCalledWith(`${config.paths.pull}/${id}`)
          expect(result).toBeDefined()
      
    });      
  });

  describe('live sync', () => {

      it('should sync actors that are in both sides if it was added by resolver', async () => {
        const id = faker.random.uuid(),
        config = {
          sync: {
              active: true,
              delay: faker.random.number(1000)
          },
            paths: {
                pull: faker.internet.url(), 
                push: faker.internet.url(), 
            },
            ActorTypes: { FakeActor }
        },
        expectToJson = {
            data:{
                type: "FakeActor",
                random: faker.random.uuid(),
                id
            }
          }
      mockAxios.get.mockResolvedValue(expectToJson)

        let local = new RemoteResolverMaterializer(config)
        
        await local.resolveActorById(id)
        
        mockAxios.get.mockClear()
        jest.advanceTimersByTime(config.sync.delay);
        
        expect(mockAxios.get).toHaveBeenCalledWith(`${config.paths.pull}/${id}`)
        expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), config.sync.delay)

    });

    it('should sync actors that are in both sides if it was added by materializer', async () => {
        const id = faker.random.uuid(),
        config = {
          sync: {
              active: true,
              delay: faker.random.number(1000)
          },
            paths: {
                pull: faker.internet.url(), 
                push: faker.internet.url(), 
            },
            ActorTypes: { FakeActor }
        },
        expectToJson = {
            data:{
                type: "FakeActor",
                random: faker.random.uuid(),
                id
            }
          },
          actor = jest.fn<Actor>(() => ({ 
            id, 
            toJson: () => Promise.resolve(expectToJson),
            fromJson: jest.fn()
          }))(),
        actorMessage = jest.fn<ActorMessage>()()
        
      mockAxios.get.mockResolvedValue(expectToJson)

        let local = new RemoteResolverMaterializer(config)
        
        await local.onAfterMessage(actor, actorMessage)
        
        mockAxios.get.mockClear()

        jest.advanceTimersByTime(config.sync.delay+10);

        expect(mockAxios.get).toHaveBeenCalledWith(`${config.paths.pull}/${id}`)
        expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), config.sync.delay)

    });
  });

  describe('as a Materializer', () => {
      it('should send message if actor is updated', async () => {
          const id = faker.random.uuid(),
          config = {
            sync: {
                active: true,
                delay: faker.random.number(1000)
            },
              paths: {
                  pull: faker.internet.url(), 
                  push: faker.internet.url(), 
              }
          },
          expectToJson = {random: faker.random.uuid() },
          actor = jest.fn<Actor>(() => ({ 
              id, 
              toJson: () => Promise.resolve(expectToJson)
            }))(),
          actorMessage = jest.fn<ActorMessage>()()
          let local = new RemoteResolverMaterializer(config)
          await local.onAfterMessage(actor, actorMessage)
          expect(mockAxios.post).toHaveBeenCalledWith(`${config.paths.push}/${id}`, expectToJson)
      });
  })
})
