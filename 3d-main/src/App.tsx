import { useEffect, useState } from 'react';
import {
  ModelAsset,
  ModelEntity,
  Reality,
  SceneGraph,
} from '@webspatial/react-sdk';
import './App.css';

type TeacherAnimationId = 'idle' | 'happyIdle' | 'talkingOne' | 'talkingTwo';

type TeacherAnimation = {
  id: string;
  label: string;
  src: string;
};

const teacherAnimations: Record<TeacherAnimationId, TeacherAnimation> = {
  idle: {
    id: 'teacher-idle',
    label: 'Idle',
    src: `${__XR_ENV_BASE__}/models/teacher/idle-apple.usdz`,
  },
  happyIdle: {
    id: 'teacher-happy-idle',
    label: 'Happy Idle',
    src: `${__XR_ENV_BASE__}/models/teacher/happy-idle-apple.usdz`,
  },
  talkingOne: {
    id: 'teacher-talking-one',
    label: 'Talking A',
    src: `${__XR_ENV_BASE__}/models/teacher/talking-apple.usdz`,
  },
  talkingTwo: {
    id: 'teacher-talking-two',
    label: 'Talking B',
    src: `${__XR_ENV_BASE__}/models/teacher/talking2-apple.usdz`,
  },
};

const talkingAnimationIds: TeacherAnimationId[] = ['talkingOne', 'talkingTwo'];

const pickRandomTalkingAnimation = (
  currentAnimation?: TeacherAnimationId | null,
): TeacherAnimationId => {
  const availableAnimations = talkingAnimationIds.filter(
    (animationId) => animationId !== currentAnimation,
  );
  const animationPool =
    availableAnimations.length > 0 ? availableAnimations : talkingAnimationIds;

  return animationPool[Math.floor(Math.random() * animationPool.length)];
};

function App() {
  const [isTalking, setIsTalking] = useState(false);
  const [activeTalkingAnimation, setActiveTalkingAnimation] =
    useState<TeacherAnimationId | null>(null);

  useEffect(() => {
    window.luminaryTeacher = {
      setTalking: (nextState: boolean) => setIsTalking(nextState),
      toggleTalking: () => setIsTalking((currentState) => !currentState),
    };

    return () => {
      delete window.luminaryTeacher;
    };
  }, []);

  useEffect(() => {
    if (!isTalking) {
      return undefined;
    }

    setActiveTalkingAnimation((currentAnimation) =>
      pickRandomTalkingAnimation(currentAnimation),
    );

    const animationTimer = window.setInterval(() => {
      setActiveTalkingAnimation((currentAnimation) =>
        pickRandomTalkingAnimation(currentAnimation),
      );
    }, 3200);

    return () => {
      window.clearInterval(animationTimer);
    };
  }, [isTalking]);

  const activeAnimation =
    isTalking && activeTalkingAnimation
      ? teacherAnimations[activeTalkingAnimation]
      : teacherAnimations.idle;

  return (
    <main className="app-shell">
      <div className="spatial-canvas">
        <Reality
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
          }}
        >
          {Object.values(teacherAnimations).map((animation) => (
            <ModelAsset key={animation.id} id={animation.id} src={animation.src} />
          ))}

          <SceneGraph>
            <ModelEntity
              key={activeAnimation.id}
              model={activeAnimation.id}
              position={{ x: 0, y: 0.18, z: 0 }}
              rotation={{ x: 0, y: 180, z: 0 }}
              scale={{ x: 0.28, y: 0.28, z: 0.28 }}
            />
          </SceneGraph>
        </Reality>
      </div>

      <section className="hud">
        <p className="eyebrow">LUMINARY</p>
        <h1>Teacher Avatar</h1>
        <p className="status-copy">
          {isTalking
            ? `Speaking with ${activeAnimation.label}`
            : 'Waiting in idle mode'}
        </p>

        <div className="controls">
          <button type="button" onClick={() => setIsTalking(true)}>
            Start Talking
          </button>
          <button type="button" onClick={() => setIsTalking(false)}>
            Stop Talking
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setActiveTalkingAnimation(null)}
          >
            Reset Talk Cycle
          </button>
        </div>

        <p className="helper-text">
          External control is also available via
          {' '}
          <code>window.luminaryTeacher.setTalking(true)</code>.
        </p>
      </section>
    </main>
  );
}

export default App;
