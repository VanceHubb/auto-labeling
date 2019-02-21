import { Application } from 'probot'

export = (app: Application) => {
  app.on('issue_comment', async (context) => {
    // console.log(JSON.stringify(context.payload, null, 2));

    if (context.payload.action !== 'edited' && context.payload.action !== 'created') {
      return;
    }
    const body: string = context.payload.comment.body || '';
    const addLabelParser = body.match(/\/add[L|l]abel ([^\n]+)/);
    if (addLabelParser && addLabelParser[1]) {
      const labels = addLabelParser[1].split(',').map(label => label.trim());
      const availableLabels = (await context.github.issues.listLabelsForRepo({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        page: 1,
        per_page: 100
      })).data.map(labelData => labelData.name);
      const filteredLabels = labels.filter(label =>
        availableLabels.find(availableLabel => availableLabel === label));

      await context.github.issues.addLabels({
        labels: filteredLabels,
        number: context.payload.issue.number,
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name
      });

      await context.github.issues.updateComment({
        body: body.replace(addLabelParser[0], filteredLabels.length > 0 ?
          `[*${filteredLabels.join(',')}* added by auto-labeling bot]` : 'No label recognizable'),
        comment_id: context.payload.comment.id,
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name
      })
    }

    const removeLabelParser = body.match(/\/remove[L|l]abel ([^\n]+)/);
    if (removeLabelParser && removeLabelParser[1]) {
      const labels = removeLabelParser[1].split(',').map(label => label.trim());
      const filteredLabels = [];
      for (let i = 0; i < labels.length; i++) {
        try {
          await context.github.issues.removeLabel({
            name: labels[i],
            number: context.payload.issue.number,
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name
          })
          filteredLabels.push(labels[i]);
        } catch (e) { }
      }

      await context.github.issues.updateComment({
        body: body.replace(removeLabelParser[0], filteredLabels.length > 0 ?
          `[*${filteredLabels.join(',')}* removed by auto-labeling bot]` : 'No label recognizable'),
        comment_id: context.payload.comment.id,
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name
      })
    }
  })
}
