export function waitUntilAnimationsFinish(element) {
    const animationsPromises = element.getAnimations().map(animation => animation.finished);

    return Promise.allSettled(animationsPromises);
}